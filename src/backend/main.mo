import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";



actor {
  type Troops = {
    soldiers : Nat;
    tanks : Nat;
    jets : Nat;
  };

  type Player = {
    id : Principal;
    username : Text;
    serverId : Nat;
    posX : Float;
    posY : Float;
    hp : Nat;
    level : Nat;
    resources : {
      wood : Nat;
      stone : Nat;
      food : Nat;
    };
    lastSeen : Time.Time;
    baseHp : Nat;
    wallHp : Nat;
    troops : Troops;
    upgradeLevel : Nat;
    shieldActive : Bool;
    shieldCooldownUntil : Time.Time;
  };

  module Player {
    public func compare(player1 : Player, player2 : Player) : { #less; #equal; #greater } {
      Principal.compare(player1.id, player2.id);
    };
  };

  type Clan = {
    id : Nat;
    name : Text;
    color : Text;
    leaderId : Principal;
    memberIds : [Principal];
    serverId : Nat;
  };

  module Clan {
    public func compare(clan1 : Clan, clan2 : Clan) : { #less; #equal; #greater } {
      Nat.compare(clan1.id, clan2.id);
    };
  };

  type TerritoryCell = {
    cellX : Nat;
    cellY : Nat;
    clanId : Nat;
    serverId : Nat;
  };

  type ResourceField = {
    id : Nat;
    typ : Text;
    posX : Float;
    posY : Float;
    controlledByClanId : ?Nat;
    serverId : Nat;
  };

  module ResourceField {
    public func compare(field1 : ResourceField, field2 : ResourceField) : { #less; #equal; #greater } {
      Nat.compare(field1.id, field2.id);
    };
  };

  // Implementing comparison for (Nat, Nat, Nat)
  module Coordinates {
    public func compare(a : (Nat, Nat, Nat), b : (Nat, Nat, Nat)) : Order.Order {
      switch (Nat.compare(a.0, b.0)) {
        case (#equal) {
          switch (Nat.compare(a.1, b.1)) {
            case (#equal) { Nat.compare(a.2, b.2) };
            case (order) { order };
          };
        };
        case (order) { order };
      };
    };
  };

  type ChatMessage = {
    id : Nat;
    username : Text;
    content : Text;
    timestamp : Time.Time;
    serverId : Nat;
  };

  type AttackLog = {
    id : Nat;
    attackerUsername : Text;
    attackerClanName : Text;
    targetId : Nat;
    targetType : Text;
    serverId : Nat;
    timestamp : Time.Time;
    damage : Nat;
  };

  type GameSave = {
    id : Nat;
    timestamp : Time.Time;
    serverId : Nat;
    description : Text;
    players : [Player];
    clans : [Clan];
    territory : [TerritoryCell];
    resourceFields : [ResourceField];
  };

  type ServerInfo = {
    name : Text;
    playerCount : Nat;
    isOnline : Bool;
  };

  type BossNPC = {
    baseHp : Nat;
    wallHp : Nat;
    shieldCooldownUntil : Time.Time;
    defeated : Bool;
    serverId : Nat;
  };

  let players = Map.empty<Principal, Player>();
  let clans = Map.empty<Nat, Clan>();
  let territory = Map.empty<(Nat, Nat, Nat), Nat>();
  let resourceFields = Map.empty<Nat, ResourceField>();
  let chatMessages = Map.empty<Nat, ChatMessage>();
  let attackLogs = Map.empty<Nat, AttackLog>();
  let gameSaves = Map.empty<Nat, GameSave>();
  let bosses = Map.empty<Nat, BossNPC>();

  var nextClanId = 1;
  var nextChatId = 1;
  var nextAttackId = 1;
  var nextResourceFieldId = 1;
  var nextSaveId = 1;

  public shared ({ caller }) func registerOrUpdatePlayer(username : Text, serverId : Nat, posX : Float, posY : Float) : async () {
    if (serverId < 1 or serverId > 3) { Runtime.trap("Invalid serverId") };

    let player : Player = {
      id = caller;
      username;
      serverId;
      posX;
      posY;
      hp = 100;
      level = 1;
      resources = { wood = 100; stone = 100; food = 100 };
      lastSeen = Time.now();
      baseHp = 1000;
      wallHp = 500;
      troops = { soldiers = 1000; tanks = 1000; jets = 1000 };
      upgradeLevel = 1;
      shieldActive = false;
      shieldCooldownUntil = 0;
    };
    players.add(caller, player);
  };

  public shared ({ caller }) func getPlayersOnServer(serverId : Nat) : async [Player] {
    players.values().toArray().filter(
      func(p) { p.serverId == serverId }
    );
  };

  public query ({ caller }) func getPlayer(playerId : Principal) : async Player {
    switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player not found") };
      case (?player) { player };
    };
  };

  public shared ({ caller }) func createClan(name : Text, color : Text, serverId : Nat) : async Nat {
    let newId = nextClanId;
    let clan : Clan = {
      id = newId;
      name;
      color;
      leaderId = caller;
      memberIds = [caller];
      serverId;
    };
    clans.add(newId, clan);
    nextClanId += 1;
    newId;
  };

  public shared ({ caller }) func joinClan(clanId : Nat) : async () {
    switch (clans.get(clanId)) {
      case (null) { Runtime.trap("Clan not found") };
      case (?clan) {
        if (clan.memberIds.find(func(id) { id == caller }) != null) {
          Runtime.trap("Already a member");
        };
        let newMembers = clan.memberIds.concat([caller]);
        let updatedClan : Clan = {
          id = clan.id;
          name = clan.name;
          color = clan.color;
          leaderId = clan.leaderId;
          memberIds = newMembers;
          serverId = clan.serverId;
        };
        clans.add(clanId, updatedClan);
      };
    };
  };

  public shared ({ caller }) func claimTerritory(serverId : Nat, cellX : Nat, cellY : Nat, clanId : Nat) : async () {
    if (cellX >= 50 or cellY >= 50) { Runtime.trap("Invalid cell coordinates") };
    territory.add((serverId, cellX, cellY), clanId);
  };

  public shared ({ caller }) func initializeResourceFields(serverId : Nat) : async () {
    let types = ["wood", "stone", "food"];
    for (i in Nat.range(0, 20)) {
      let field : ResourceField = {
        id = nextResourceFieldId;
        typ = types[i % 3];
        posX = i.toFloat() * 50;
        posY = i.toFloat() * 50;
        controlledByClanId = null;
        serverId;
      };
      resourceFields.add(nextResourceFieldId, field);
      nextResourceFieldId += 1;
    };
  };

  public shared ({ caller }) func sendChatMessage(serverId : Nat, username : Text, content : Text) : async () {
    if (content.size() > 200) { Runtime.trap("Message too long") };
    let message : ChatMessage = {
      id = nextChatId;
      username;
      content;
      timestamp = Time.now();
      serverId;
    };
    chatMessages.add(nextChatId, message);
    nextChatId += 1;
  };

  public shared ({ caller }) func recordAttack(attackerUsername : Text, attackerClanName : Text, targetId : Nat, targetType : Text, serverId : Nat, damage : Nat) : async () {
    let attack : AttackLog = {
      id = nextAttackId;
      attackerUsername;
      attackerClanName;
      targetId;
      targetType;
      serverId;
      timestamp = Time.now();
      damage;
    };
    attackLogs.add(nextAttackId, attack);
    nextAttackId += 1;
  };

  public query ({ caller }) func getServerInfo(serverId : Nat) : async ServerInfo {
    let playerCount = players.values().toArray().filter(
      func(p) { p.serverId == serverId }
    ).size();
    {
      name = "Server #" # serverId.toText();
      playerCount;
      isOnline = true;
    };
  };

  public shared ({ caller }) func setPlayerShield(playerId : Principal, active : Bool) : async () {
    switch (players.get(playerId)) {
      case (null) { Runtime.trap("Player not found") };
      case (?player) {
        let now = Time.now();
        if (active) {
          if (now < player.shieldCooldownUntil) {
            Runtime.trap("Shield is on cooldown");
          };
          let updatedPlayer : Player = {
            id = player.id;
            username = player.username;
            serverId = player.serverId;
            posX = player.posX;
            posY = player.posY;
            hp = player.hp;
            level = player.level;
            resources = player.resources;
            lastSeen = player.lastSeen;
            baseHp = player.baseHp;
            wallHp = player.wallHp;
            troops = player.troops;
            upgradeLevel = player.upgradeLevel;
            shieldActive = true;
            shieldCooldownUntil = now + 600000000000;
          };
          players.add(playerId, updatedPlayer);
        } else {
          let updatedPlayer : Player = { player with shieldActive = false };
          players.add(playerId, updatedPlayer);
        };
      };
    };
  };

  public shared ({ caller }) func upgradeBase(upgradeType : Text) : async () {
    switch (players.get(caller)) {
      case (null) { Runtime.trap("Player not found") };
      case (?player) {
        let updatedPlayer : Player = { player with upgradeLevel = player.upgradeLevel + 1 };
        players.add(caller, updatedPlayer);
      };
    };
  };

  public shared ({ caller }) func updateTroops(troops : Troops) : async () {
    switch (players.get(caller)) {
      case (null) { Runtime.trap("Player not found") };
      case (?player) {
        let updatedPlayer : Player = { player with troops };
        players.add(caller, updatedPlayer);
      };
    };
  };

  public shared ({ caller }) func getBossNPC(serverId : Nat) : async BossNPC {
    switch (bosses.get(serverId)) {
      case (null) {
        let boss : BossNPC = {
          baseHp = 5000;
          wallHp = 2000;
          shieldCooldownUntil = 0;
          defeated = false;
          serverId;
        };
        bosses.add(serverId, boss);
        boss;
      };
      case (?boss) { boss };
    };
  };

  public shared ({ caller }) func attackBossNPC(serverId : Nat, damage : Nat) : async () {
    switch (bosses.get(serverId)) {
      case (null) { Runtime.trap("Boss not found") };
      case (?boss) {
        if (boss.defeated) {
          if (Time.now() > boss.shieldCooldownUntil) {
            let respawnedBoss : BossNPC = {
              baseHp = 5000;
              wallHp = 2000;
              shieldCooldownUntil = 0;
              defeated = false;
              serverId = boss.serverId;
            };
            bosses.add(serverId, respawnedBoss);
          } else {
            Runtime.trap("Boss is on cooldown");
          };
        } else {
          let remainingHp = if (damage >= boss.baseHp) { 0 } else {
            boss.baseHp - damage
          };
          let isDefeated = remainingHp == 0;
          let updatedBoss : BossNPC = {
            baseHp = remainingHp;
            wallHp = boss.wallHp;
            shieldCooldownUntil = if (isDefeated) { Time.now() + 1800000000000 } else {
              boss.shieldCooldownUntil
            };
            defeated = isDefeated;
            serverId = boss.serverId;
          };
          bosses.add(serverId, updatedBoss);
        };
      };
    };
  };

  public shared ({ caller }) func healPlayerWall(wallHpAmount : Nat) : async () {
    switch (players.get(caller)) {
      case (null) { Runtime.trap("Player not found") };
      case (?player) {
        let maxWall = 500;
        let newWallHp = Nat.min(player.wallHp + wallHpAmount, maxWall);
        let updatedPlayer : Player = { player with wallHp = newWallHp };
        players.add(caller, updatedPlayer);
      };
    };
  };
};
