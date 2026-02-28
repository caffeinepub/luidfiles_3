import List "mo:core/List";
import Map "mo:core/Map";
import Blob "mo:core/Blob";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Nat32 "mo:core/Nat32";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // COMPONENT: BLOB STORAGE
  include MixinStorage();

  // COMPONENT: AUTHORIZATION
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  type UserId = Nat32;
  type FileId = Nat32;
  type SessionToken = Text;

  type Role = { #Master; #Staff; #Client };
  let roleMaster : Role = #Master;

  type UploadStatus = { #Pending; #Complete };

  public type UserProfile = {
    id : UserId;
    username : Text;
    role : Role;
    quota : Nat;
    usedBytes : Nat;
    gbAllocation : Nat;
  };

  type InternalUser = {
    id : UserId;
    username : Text;
    passwordHash : Text;
    role : Role;
    gbAllocation : Nat;
    quota : Nat;
    usedBytes : Nat;
  };

  type File = {
    fileId : FileId;
    owner : UserId;
    filename : Text;
    mimeType : Text;
    totalSize : Nat;
    totalChunks : Nat;
    status : UploadStatus;
    created : Int;
    shareToken : ?Text;
  };

  type Chunk = Blob;

  type Session = {
    userId : UserId;
    token : SessionToken;
    created : Int;
    lastActive : Int;
  };

  // Maps
  let users = Map.empty<UserId, InternalUser>();
  let usersByName = Map.empty<Text, UserId>();
  let files = Map.empty<FileId, File>();
  let chunks = Map.empty<Text, Chunk>();
  let sessions = Map.empty<SessionToken, Session>();
  let shareTokens = Map.empty<Text, FileId>();

  var userIdCounter : UserId = 0;
  var fileIdCounter : FileId = 0;

  // Helpers
  func hashPassword(password : Text) : Text {
    password;
  };

  func createToken(seed : Text) : SessionToken {
    let timestamp = Time.now().toText();
    seed # timestamp # timestamp;
  };

  func chunkKey(fileId : FileId, index : Nat) : Text {
    fileId.toText() # "_" # index.toText()
  };

  func requireSession(token : SessionToken) : InternalUser {
    switch (sessions.get(token)) {
      case (null) { Runtime.trap("Unauthorized: Invalid or expired session token") };
      case (?session) {
        switch (users.get(session.userId)) {
          case (null) { Runtime.trap("Unauthorized: User not found for session") };
          case (?user) { user };
        };
      };
    };
  };

  // Master-only: can manage all roles including Staff
  func requireMaster(token : SessionToken) : InternalUser {
    let user = requireSession(token);
    if (user.role != #Master) {
      Runtime.trap("Unauthorized: Only Master role can perform this action");
    };
    user;
  };

  // Master or Staff: can manage Clients only
  func requireMasterOrStaff(token : SessionToken) : InternalUser {
    let user = requireSession(token);
    if (user.role != #Master and user.role != #Staff) {
      Runtime.trap("Unauthorized: Only Master or Staff roles can perform this action");
    };
    user;
  };

  func toPublicProfile(u : InternalUser) : UserProfile {
    {
      id = u.id;
      username = u.username;
      role = u.role;
      quota = u.quota;
      usedBytes = u.usedBytes;
      gbAllocation = u.gbAllocation;
    };
  };

  func nextUserId() : UserId {
    userIdCounter += 1;
    userIdCounter
  };

  func nextFileId() : FileId {
    fileIdCounter += 1;
    fileIdCounter
  };

  // Seed master account
  do {
    let masterId : UserId = nextUserId();
    let masterUser : InternalUser = {
      id = masterId;
      username = "SidneiCosta00";
      passwordHash = hashPassword("Nikebolado@4");
      role = #Master;
      gbAllocation = 0;
      quota = 5_000_000_000;
      usedBytes = 0;
    };
    users.add(masterId, masterUser);
    usersByName.add("SidneiCosta00", masterId);
  };

  // ── Authentication ─────────────────────────────────────────────────────

  public shared ({ caller }) func login(username : Text, password : Text) : async SessionToken {
    switch (usersByName.get(username)) {
      case (null) { Runtime.trap("Invalid username or password") };
      case (?uid) {
        switch (users.get(uid)) {
          case (null) { Runtime.trap("Invalid username or password") };
          case (?user) {
            if (user.passwordHash != hashPassword(password)) {
              Runtime.trap("Invalid username or password");
            };
            let token = createToken(username # password # Time.now().toText());
            let session : Session = {
              userId = user.id;
              token;
              created = Time.now();
              lastActive = Time.now();
            };
            sessions.add(token, session);
            token;
          };
        };
      };
    };
  };

  public shared ({ caller }) func logout(token : SessionToken) : async () {
    sessions.remove(token);
  };

  public query ({ caller }) func validateSession(token : SessionToken) : async { role : Role; username : Text } {
    let user = requireSession(token);
    { role = user.role; username = user.username };
  };

  public query ({ caller }) func getMe(token : SessionToken) : async UserProfile {
    let user = requireSession(token);
    toPublicProfile(user);
  };

  // Self-registration: always assigns Client role and 5 GB quota/allocation
  public shared ({ caller }) func registerUser(username : Text, password : Text) : async UserId {
    switch (usersByName.get(username)) {
      case (?_) { Runtime.trap("Username already taken") };
      case (null) {};
    };
    let uid = nextUserId();
    let newUser : InternalUser = {
      id = uid;
      username;
      passwordHash = hashPassword(password);
      role = #Client;
      gbAllocation = 5;
      quota = 5_000_000_000; // 5 GB in bytes
      usedBytes = 0;
    };
    users.add(uid, newUser);
    usersByName.add(username, uid);
    uid;
  };

  // ── User Management ────────────────────────────────────────────────────

  // Master and Staff can list users
  public query ({ caller }) func listUsers(token : SessionToken) : async [UserProfile] {
    ignore requireMasterOrStaff(token);
    users.values().map(toPublicProfile).toArray();
  };

  // Master can create any role; Staff can only create Client accounts
  public shared ({ caller }) func createUser(token : SessionToken, username : Text, password : Text, role : Role) : async UserId {
    let actor_ = requireMasterOrStaff(token);
    // Staff can only create Client accounts
    if (actor_.role == #Staff and role != #Client) {
      Runtime.trap("Unauthorized: Staff can only create Client accounts");
    };
    switch (usersByName.get(username)) {
      case (?_) { Runtime.trap("Username already taken") };
      case (null) {};
    };
    let uid = nextUserId();
    let defaultQuota : Nat = switch (role) {
      case (#Client) { 5_000_000_000 }; // 5 GB for clients
      case (_) { 5_000_000_000 };
    };
    let defaultGbAllocation : Nat = switch (role) {
      case (#Client) { 5 }; // 5 GB allocation for clients
      case (_) { 0 };
    };
    let newUser : InternalUser = {
      id = uid;
      username;
      passwordHash = hashPassword(password);
      role;
      gbAllocation = defaultGbAllocation;
      quota = defaultQuota;
      usedBytes = 0;
    };
    users.add(uid, newUser);
    usersByName.add(username, uid);
    uid;
  };

  // Master can delete any user; Staff can only delete Client accounts
  public shared ({ caller }) func deleteUser(token : SessionToken, userId : UserId) : async () {
    let actor_ = requireMasterOrStaff(token);
    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?u) {
        // Staff cannot delete Master or Staff accounts
        if (actor_.role == #Staff and u.role != #Client) {
          Runtime.trap("Unauthorized: Staff can only delete Client accounts");
        };
        // Nobody can delete the Master account via this function
        if (u.role == #Master) {
          Runtime.trap("Unauthorized: Cannot delete Master account");
        };
        usersByName.remove(u.username);
        users.remove(userId);
      };
    };
  };

  // Only Master can change roles; Staff cannot change roles at all
  public shared ({ caller }) func updateUserRole(token : SessionToken, userId : UserId, role : Role) : async () {
    ignore requireMaster(token);
    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?u) {
        // Cannot change the role of the Master account
        if (u.role == #Master) {
          Runtime.trap("Unauthorized: Cannot change the role of the Master account");
        };
        users.add(userId, { u with role });
      };
    };
  };

  // Master and Staff can update GB limit, but only for Client accounts
  public shared ({ caller }) func updateUserGbLimit(token : SessionToken, userId : UserId, gbLimit : Nat) : async () {
    ignore requireMasterOrStaff(token);
    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?u) {
        if (u.role != #Client) {
          Runtime.trap("Can only set GB limit for Client accounts");
        };
        users.add(userId, { u with gbAllocation = gbLimit; quota = gbLimit * 1_000_000_000 });
      };
    };
  };

  // Master and Staff can view storage stats for any user
  public query ({ caller }) func getUserStorageStats(token : SessionToken, userId : UserId) : async { quota : Nat; usedBytes : Nat; gbAllocation : Nat } {
    ignore requireMasterOrStaff(token);
    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?u) { { quota = u.quota; usedBytes = u.usedBytes; gbAllocation = u.gbAllocation } };
    };
  };

  // Get current user's storage quota and usage (for the current session)
  public query ({ caller }) func getMyStorageStats(token : SessionToken) : async { quota : Nat; usedBytes : Nat; gbAllocation : Nat } {
    let user = requireSession(token);
    { quota = user.quota; usedBytes = user.usedBytes; gbAllocation = user.gbAllocation };
  };

  // ── Chunked Upload ────────────────────────────────────────────────────

  public shared ({ caller }) func initUpload(token : SessionToken, filename : Text, mimeType : Text, totalSize : Nat, totalChunks : Nat) : async FileId {
    let user = requireSession(token);
    if (user.usedBytes + totalSize > user.quota) {
      Runtime.trap("Storage quota exceeded");
    };
    let fid = nextFileId();
    let f : File = {
      fileId = fid;
      owner = user.id;
      filename;
      mimeType;
      totalSize;
      totalChunks;
      status = #Pending;
      created = Time.now();
      shareToken = null;
    };
    files.add(fid, f);
    fid;
  };

  // Supports at least 2MB chunks (up to 2_097_152 bytes / chunk)
  public shared ({ caller }) func uploadChunk(token : SessionToken, fileId : FileId, chunkIndex : Nat, chunkData : Chunk) : async Nat {
    let user = requireSession(token);
    switch (files.get(fileId)) {
      case (null) { Runtime.trap("File not found") };
      case (?f) {
        if (f.owner != user.id and user.role != #Master and user.role != #Staff) {
          Runtime.trap("Unauthorized: Not the file owner");
        };
        chunks.add(chunkKey(fileId, chunkIndex), chunkData);
        var count = 0;
        for (i in Nat.range(0, f.totalChunks)) {
          switch (chunks.get(chunkKey(fileId, i))) {
            case (?_) { count += 1 };
            case (null) {};
          };
        };
        count;
      };
    };
  };

  public shared ({ caller }) func finalizeUpload(token : SessionToken, fileId : FileId) : async () {
    let user = requireSession(token);
    switch (files.get(fileId)) {
      case (null) { Runtime.trap("File not found") };
      case (?f) {
        if (f.owner != user.id and user.role != #Master and user.role != #Staff) {
          Runtime.trap("Unauthorized: Not the file owner");
        };
        for (i in Nat.range(0, f.totalChunks)) {
          switch (chunks.get(chunkKey(fileId, i))) {
            case (null) { Runtime.trap("Missing chunk: " # i.toText()) };
            case (?_) {};
          };
        };
        files.add(fileId, { f with status = #Complete });
        switch (users.get(f.owner)) {
          case (null) {};
          case (?owner) {
            users.add(f.owner, { owner with usedBytes = owner.usedBytes + f.totalSize });
          };
        };
      };
    };
  };

  // ── File Functions ─────────────────────────────────────────────────────

  // Master and Staff see all files; Clients see only their own
  public query ({ caller }) func listFiles(token : SessionToken) : async [File] {
    let user = requireSession(token);
    if (user.role == #Master or user.role == #Staff) {
      files.values().toArray();
    } else {
      files.values().filter(func(f : File) : Bool { f.owner == user.id }).toArray();
    };
  };

  public query ({ caller }) func downloadFile(fileId : FileId, token : ?SessionToken, shareToken : ?Text) : async { data : Blob; mimeType : Text; filename : Text } {
    switch (files.get(fileId)) {
      case (null) { Runtime.trap("File not found") };
      case (?f) {
        var authorised = false;
        switch (shareToken) {
          case (?st) {
            switch (shareTokens.get(st)) {
              case (?fid) { if (fid == fileId) { authorised := true } };
              case (null) {};
            };
          };
          case (null) {};
        };
        if (not authorised) {
          switch (token) {
            case (null) { Runtime.trap("Unauthorized: Provide a session or share token") };
            case (?t) {
              let user = requireSession(t);
              if (f.owner == user.id or user.role == #Master or user.role == #Staff) {
                authorised := true;
              } else {
                Runtime.trap("Unauthorized: Not the file owner");
              };
            };
          };
        };
        if (not authorised) {
          Runtime.trap("Unauthorized");
        };
        var parts : [Chunk] = [];
        for (i in Nat.range(0, f.totalChunks)) {
          switch (chunks.get(chunkKey(fileId, i))) {
            case (null) { Runtime.trap("Missing chunk: " # i.toText()) };
            case (?c) { parts := parts.concat([c]) };
          };
        };

        if (parts.isEmpty()) { Runtime.trap("No chunks found. Cannot assemble file.") };

        let data = Blob.fromArray(parts.map(Blob.toArray).flatten());
        { data; mimeType = f.mimeType; filename = f.filename };
      };
    };
  };

  // Owner, Master, or Staff can delete files
  public shared ({ caller }) func deleteFile(token : SessionToken, fileId : FileId) : async () {
    let user = requireSession(token);
    switch (files.get(fileId)) {
      case (null) { Runtime.trap("File not found") };
      case (?f) {
        if (f.owner != user.id and user.role != #Master and user.role != #Staff) {
          Runtime.trap("Unauthorized: Not the file owner");
        };
        for (i in Nat.range(0, f.totalChunks)) {
          chunks.remove(chunkKey(fileId, i));
        };
        switch (f.shareToken) {
          case (?st) { shareTokens.remove(st) };
          case (null) {};
        };
        files.remove(fileId);
        switch (users.get(f.owner)) {
          case (null) {};
          case (?owner) {
            let newUsed = if (owner.usedBytes >= f.totalSize) { owner.usedBytes - f.totalSize } else { 0 };
            users.add(f.owner, { owner with usedBytes = newUsed });
          };
        };
      };
    };
  };

  // Owner, Master, or Staff can generate share links
  public shared ({ caller }) func generateShareLink(token : SessionToken, fileId : FileId) : async Text {
    let user = requireSession(token);
    switch (files.get(fileId)) {
      case (null) { Runtime.trap("File not found") };
      case (?f) {
        if (f.owner != user.id and user.role != #Master and user.role != #Staff) {
          Runtime.trap("Unauthorized: Not the file owner");
        };
        switch (f.shareToken) {
          case (?st) { st };
          case (null) {
            let st = createToken("share" # fileId.toText() # Time.now().toText());
            files.add(fileId, { f with shareToken = ?st });
            shareTokens.add(st, fileId);
            st;
          };
        };
      };
    };
  };

  // ── UserProfile helpers (required by frontend/instructions) ──────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated");
    };
    null;
  };

  public shared ({ caller }) func saveCallerUserProfile(_profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated");
    };
  };

  public query ({ caller }) func getUserProfile(_user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated");
    };
    null;
  };
};
