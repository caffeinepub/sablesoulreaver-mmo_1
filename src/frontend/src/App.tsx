import { Toaster } from "@/components/ui/sonner";
import React, { useCallback } from "react";
import { GameScreen } from "./components/GameScreen";
import { ServerSelectScreen } from "./components/ServerSelectScreen";
import { UsernameScreen } from "./components/UsernameScreen";
import { useGameState } from "./hooks/useGameState";
import type {
  DragonNPC,
  GamePlayer,
  NPCBase,
  ResourceField,
} from "./types/game";

export default function App() {
  const {
    screen,
    setScreen,
    username,
    setUsername,
    serverId,
    players,
    myPlayer,
    setMyPlayer,
    clans,
    territory,
    resources,
    chatMessages,
    attackNotifications,
    serverInfos,
    fetchServerInfos,
    joinServer,
    sendChat,
    createClan,
    joinClanById,
    captureResource,
    attackBase,
    saveGame,
    loadGame,
    garrisonTroops,
    // New features
    attackFlashes,
    bossNPC,
    myShieldActive,
    shieldCooldownUntil,
    healingQueue,
    upgrades,
    teleports,
    trainingInterval,
    lastTrainingAt,
    useTeleport,
    toggleShield,
    attackBoss,
    upgradeStructure,
    getShareLink,
    kickMember,
    setClanMOTD,
    leaveClan,
    promoteMember,
    // HQ + clan points
    buildClanHQ,
    teleportClanHQ,
    attackClanHQ,
    spendClanPoints,
    donateGoldForHQPoints,
    changeMemberRank,
    clanInvites,
    sendClanInvite,
    acceptClanInvite,
    declineClanInvite,
    // War
    declareWar,
    endWar,
    activateClanShield,
    npcBases,
    attackNPCBase,
    sendAid,
    dragons,
    attackDragon,
    claimNearbyTiles,
    claimTileCooldown,
    relocateNPCBase,
    respawnDefeatedPlayer,
    atomBombs,
    launchAtomBomb,
    activeSpyPlanes,
    deploySpyPlane,
    addSpyPlanes,
  } = useGameState();

  const troops = myPlayer?.troops ?? { soldiers: 0, tanks: 0, jets: 0 };

  const handleUsernameConfirm = useCallback(
    async (u: string) => {
      setUsername(u);
      const params = new URLSearchParams(window.location.search);
      const sParam = Number(params.get("server"));
      if (sParam >= 1 && sParam <= 3) {
        try {
          await joinServer(sParam);
        } catch {
          setScreen("server-select");
        }
      } else {
        setScreen("server-select");
      }
    },
    [setUsername, joinServer, setScreen],
  );

  const handleAttackNPCBase = useCallback(
    (base: NPCBase) => {
      const damage = 1000;
      attackNPCBase(base.id, damage);
    },
    [attackNPCBase],
  );

  const handleRelocateNPCBase = useCallback(
    (id: string, x: number, y: number) => {
      relocateNPCBase(id, x, y);
    },
    [relocateNPCBase],
  );

  const handleRespawnDefeatedPlayer = useCallback(
    (playerId: string) => {
      respawnDefeatedPlayer(playerId);
    },
    [respawnDefeatedPlayer],
  );

  const handleAttackDragon = useCallback(
    (dragon: DragonNPC) => {
      const damage = 1000;
      attackDragon(dragon.id, damage);
    },
    [attackDragon],
  );

  const handleDragonAutoAttack = useCallback(
    (
      targetType: "player" | "npc" | "npcBase",
      targetId: string,
      damage: number,
    ) => {
      if (targetType === "npcBase") {
        attackNPCBase(targetId, damage);
      } else if (targetType === "npc") {
        attackDragon(targetId, damage);
      }
      // player targets: visual only (dragon fire pushes enemies back)
    },
    [attackNPCBase, attackDragon],
  );

  const handleAttackBase = useCallback(
    (player: GamePlayer) => {
      const damage = 1000;
      return attackBase(player, damage);
    },
    [attackBase],
  );

  const handleAttackResource = useCallback(
    (fieldId: string) => {
      return captureResource(fieldId);
    },
    [captureResource],
  );

  const handleAttackBoss = useCallback(
    (damage: number) => {
      attackBoss(damage);
    },
    [attackBoss],
  );

  const handleInitResources = useCallback(() => {
    const key = `ssmmo_resources_server_${serverId}`;
    localStorage.removeItem(key);
    window.location.reload();
  }, [serverId]);

  const handleUpdateBasePhoto = useCallback(
    (photoUrl: string | null) => {
      setMyPlayer((prev) =>
        prev ? { ...prev, basePhotoUrl: photoUrl ?? undefined } : prev,
      );
    },
    [setMyPlayer],
  );

  const handleThugRaidComplete = useCallback(
    (soldierLoss: number) => {
      setMyPlayer((prev) => {
        if (!prev) return prev;
        const t = prev.troops || { soldiers: 0, tanks: 0, jets: 0 };
        return {
          ...prev,
          troops: { ...t, soldiers: Math.max(0, t.soldiers - soldierLoss) },
        };
      });
    },
    [setMyPlayer],
  );

  if (screen === "username") {
    return (
      <>
        <UsernameScreen onConfirm={handleUsernameConfirm} />
        <Toaster />
      </>
    );
  }

  if (screen === "server-select") {
    return (
      <>
        <ServerSelectScreen
          username={username}
          serverInfos={serverInfos}
          onFetchInfos={fetchServerInfos}
          onJoin={joinServer}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <GameScreen
        username={username}
        serverId={serverId}
        players={players}
        myPlayer={myPlayer}
        clans={clans}
        territory={territory}
        resources={resources}
        chatMessages={chatMessages}
        attackNotifications={attackNotifications}
        onSendChat={sendChat}
        onAttackBase={handleAttackBase}
        onAttackResource={handleAttackResource}
        onCreateClan={createClan}
        onJoinClan={joinClanById}
        onSaveGame={saveGame}
        onLoadGame={loadGame}
        onInitResources={handleInitResources}
        attackFlashes={attackFlashes}
        bossNPC={bossNPC}
        myShieldActive={myShieldActive}
        shieldCooldownUntil={shieldCooldownUntil}
        healingQueue={healingQueue}
        upgrades={upgrades}
        teleports={teleports}
        trainingInterval={trainingInterval}
        lastTrainingAt={lastTrainingAt}
        troops={troops}
        onUseTeleport={useTeleport}
        onToggleShield={toggleShield}
        onAttackBoss={handleAttackBoss}
        onUpgradeStructure={upgradeStructure}
        getShareLink={getShareLink}
        onKickMember={kickMember}
        onLeaveClan={leaveClan}
        onSetMOTD={setClanMOTD}
        onPromoteMember={promoteMember}
        buildClanHQ={buildClanHQ}
        teleportClanHQ={teleportClanHQ}
        attackClanHQ={attackClanHQ}
        spendClanPoints={spendClanPoints}
        donateGoldForHQPoints={donateGoldForHQPoints}
        changeMemberRank={changeMemberRank}
        clanInvites={clanInvites}
        onSendClanInvite={sendClanInvite}
        onAcceptInvite={acceptClanInvite}
        onDeclineInvite={declineClanInvite}
        onDeclareWar={declareWar}
        onEndWar={endWar}
        onActivateClanShield={activateClanShield}
        npcBases={npcBases}
        onAttackNPCBase={handleAttackNPCBase}
        dragons={dragons}
        onAttackDragon={handleAttackDragon}
        onDragonAutoAttack={handleDragonAutoAttack}
        onSendAid={sendAid}
        onGarrisonTroops={garrisonTroops}
        onClaimNearbyTiles={claimNearbyTiles}
        claimTileCooldown={claimTileCooldown}
        onUpdateBasePhoto={handleUpdateBasePhoto}
        onThugRaidComplete={handleThugRaidComplete}
        onRelocateNPCBase={handleRelocateNPCBase}
        onRespawnDefeatedPlayer={handleRespawnDefeatedPlayer}
        atomBombs={atomBombs}
        onLaunchAtomBomb={launchAtomBomb}
        activeSpyPlanes={activeSpyPlanes}
        onDeploySpyPlane={deploySpyPlane}
        onAddSpyPlanes={addSpyPlanes}
      />
      <Toaster />
    </>
  );
}
