// src/addons/squid.js
import * as THREE from "three";

export function createSquidAddon() {
  let enabled = false;
  let root = null;
  let arenaFloor = null;

  let ui = { box: null, state: null, timer: null };

  let phase = "idle"; // idle | green | red | dead | finished
  let phaseT = 0;
  let timeLeft = 60;

  let doll = null;
  let dollWatching = false;

  let playerRef = null;
  let lastPlayerPos = new THREE.Vector3();
  const moveThreshold = 0.02;

  function createUI() {
    if (ui.box) return;

    ui.box = document.createElement("div");
    ui.box.style.cssText = `
      position:fixed;
      left:16px;
      top:16px;
      z-index:9999;
      font-family:system-ui;
      color:white;
      background:rgba(0,0,0,0.55);
      border:1px solid rgba(255,255,255,0.2);
      padding:12px 14px;
      border-radius:12px;
      min-width:180px;
    `;

    ui.state = document.createElement("div");
    ui.timer = document.createElement("div");

    ui.state.textContent = "Squid Game";
    ui.timer.textContent = "Laikas: 60";

    ui.box.appendChild(ui.state);
    ui.box.appendChild(ui.timer);
    document.body.appendChild(ui.box);
  }

  function removeUI() {
    if (ui.box && ui.box.parentNode) {
      ui.box.parentNode.removeChild(ui.box);
    }
    ui = { box: null, state: null, timer: null };
  }

  function createArena(scene) {
    root = new THREE.Group();
    root.name = "SquidArenaRoot";

    // GRINDYS
    const floorGeo = new THREE.CircleGeometry(26, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xd9c27a
    });

    arenaFloor = new THREE.Mesh(floorGeo, floorMat);
    arenaFloor.rotation.x = -Math.PI / 2;
    arenaFloor.position.set(1000, 0, 0);
    arenaFloor.receiveShadow = true;
    root.add(arenaFloor);

    // START linija
    const startLine = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.02, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    startLine.position.set(1000, 0.03, 18);
    root.add(startLine);

    // FINISH linija
    const finishLine = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.02, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff3355 })
    );
    finishLine.position.set(1000, 0.03, -18);
    root.add(finishLine);

    // Lėlė
    doll = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 4, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xffaa88 })
    );
    doll.position.set(1000, 2, -22);
    root.add(doll);

    scene.add(root);
  }

  function clearArena(scene) {
    if (!root) return;
    scene.remove(root);

    root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose?.());
        } else {
          obj.material.dispose?.();
        }
      }
    });

    root = null;
    arenaFloor = null;
    doll = null;
  }

  function setStateText() {
    if (!ui.state) return;
    if (phase === "green") ui.state.textContent = "🟢 GREEN LIGHT";
    else if (phase === "red") ui.state.textContent = "🔴 RED LIGHT";
    else if (phase === "dead") ui.state.textContent = "💀 PRALAIMĖJAI";
    else if (phase === "finished") ui.state.textContent = "🏆 LAIMĖJAI";
    else ui.state.textContent = "Squid Game";
  }

  function start({ scene, player }) {
    enabled = true;
    playerRef = player;
    phase = "green";
    phaseT = 0;
    timeLeft = 60;
    dollWatching = false;

    createArena(scene);
    createUI();

    if (playerRef) {
      lastPlayerPos.copy(playerRef.position);
    }

    setStateText();
    if (ui.timer) ui.timer.textContent = `Laikas: ${Math.ceil(timeLeft)}`;
  }

  function stop(scene) {
    enabled = false;
    removeUI();
    if (scene) clearArena(scene);
  }

  function update(delta, { scene, player }) {
    if (!enabled || !player) return null;

    phaseT += delta;
    timeLeft -= delta;

    if (ui.timer) ui.timer.textContent = `Laikas: ${Math.max(0, Math.ceil(timeLeft))}`;

    // GREEN / RED ciklas
    if (phase === "green" && phaseT >= 3) {
      phase = "red";
      phaseT = 0;
      dollWatching = true;
      setStateText();
    } else if (phase === "red" && phaseT >= 2) {
      phase = "green";
      phaseT = 0;
      dollWatching = false;
      setStateText();
    }

    // tikrinam judėjimą per RED
    if (phase === "red") {
      const moved = player.position.distanceTo(lastPlayerPos) > moveThreshold;
      if (moved) {
        phase = "dead";
        setStateText();
        enabled = false;
        return "dead";
      }
    }

    lastPlayerPos.copy(player.position);

    // finish linija
    if (player.position.z <= -18) {
      phase = "finished";
      setStateText();
      enabled = false;
      return "win";
    }

    if (timeLeft <= 0) {
      phase = "dead";
      setStateText();
      enabled = false;
      return "dead";
    }

    return null;
  }

  return {
    start,
    update,
    stop
  };
}