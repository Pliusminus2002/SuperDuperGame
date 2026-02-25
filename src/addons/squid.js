// src/addons/squid.js
import * as THREE from "three";

export function createSquidAddon() {
  let enabled = false;
  let root = null;

  let ui = { box: null, state: null, timer: null };

  let phase = "idle"; // idle | green | red | dead | finished
  let phaseT = 0;
  let timeLeft = 60;

  let doll = null;
  let dollWatching = false;

  let lastPlayerPos = new THREE.Vector3();
  const moveThreshold = 0.02;

  function createUI() {
    if (ui.box) return;
    ui.box = document.createElement("div");
    ui.box.style.cssText = `
      position:fixed; left:16px; top:16px; z-index:9999;
      font-family:system-ui; color:white;
      background:rgba(0,0,0,0.55); border:1px solid rgba(255,255,255,0.2);
      padding:10px 12px; border-radius:12px; min-width:180px;
    `;
    ui.box.innerHTML = `
      <div style="font-weight:800; letter-spacing:0.5px;">SQUID MODE</div>
      <div id="sq_state" style="margin-top:6px; font-size:14px;">...</div>
      <div id="sq_timer" style="margin-top:4px; font-size:14px; opacity:0.9;">...</div>
      <div style="margin-top:8px; font-size:12px; opacity:0.8;">WASD judėk. Per RED – nejudėk.</div>
    `;
    document.body.appendChild(ui.box);
    ui.state = ui.box.querySelector("#sq_state");
    ui.timer = ui.box.querySelector("#sq_timer");
  }

  function destroyUI() {
    if (!ui.box) return;
    ui.box.remove();
    ui.box = null;
    ui.state = null;
    ui.timer = null;
  }

  function buildArena(scene) {
    root = new THREE.Group();
    root.name = "SquidArena";

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 80),
      new THREE.MeshStandardMaterial({ color: 0x1b1b1b })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(1000, 0, 0);
    root.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });

    const wallL = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 80), wallMat);
    wallL.position.set(1000 - 20.5, 3, 0);
    root.add(wallL);

    const wallR = wallL.clone();
    wallR.position.x = 1000 + 20.5;
    root.add(wallR);

    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(40, 6, 1), wallMat);
    wallBack.position.set(1000, 3, -40.5);
    root.add(wallBack);

    const wallFront = wallBack.clone();
    wallFront.position.z = 40.5;
    root.add(wallFront);

    const startLine = new THREE.Mesh(
      new THREE.BoxGeometry(38, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x00aa55 })
    );
    startLine.position.set(1000, 0.03, 32);
    root.add(startLine);

    const finishLine = new THREE.Mesh(
      new THREE.BoxGeometry(38, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xaa0044 })
    );
    finishLine.position.set(1000, 0.03, -32);
    root.add(finishLine);

    doll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 3, 10),
      new THREE.MeshStandardMaterial({ color: 0xffcc88 })
    );
    doll.position.set(1000, 1.5, -36);
    root.add(doll);

    scene.add(root);
  }

  function setPhase(next) {
    phase = next;
    phaseT = 0;

    if (phase === "green") dollWatching = false;
    if (phase === "red") dollWatching = true;

    if (doll) doll.rotation.y = dollWatching ? Math.PI : 0;
  }

  function respawnPlayer(player) {
    player.position.set(1000, 0, 34);
    lastPlayerPos.copy(player.position);
    setPhase("green");
  }

  function start(ctx) {
    const { scene, player } = ctx;
    if (!scene || !player) return;

    enabled = true;
    createUI();
    if (!root) buildArena(scene);

    timeLeft = 60;
    setPhase("green");
    respawnPlayer(player);

    if (ui.state) ui.state.textContent = "GREEN ✅";
    if (ui.timer) ui.timer.textContent = `Time: ${timeLeft.toFixed(0)}s`;
  }

  function stop() {
    enabled = false;
    destroyUI();
  }

  function update(dt, ctx) {
    if (!enabled) return;
    const { player } = ctx;
    if (!player) return;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      setPhase("dead");
    }

    phaseT += dt;
    if (phase === "green" && phaseT > 2.2) setPhase("red");
    if (phase === "red" && phaseT > 1.8) setPhase("green");

    if (ui.state) ui.state.textContent = dollWatching ? "RED ⛔" : "GREEN ✅";
    if (ui.timer) ui.timer.textContent = `Time: ${timeLeft.toFixed(0)}s`;

    if (player.position.z < -32) {
      setPhase("finished");
      if (ui.state) ui.state.textContent = "FINISH 🏁";
      return;
    }

    if (dollWatching) {
      const moved = player.position.distanceTo(lastPlayerPos) > moveThreshold;
      if (moved) setPhase("dead");
    }

    if (phase === "dead") {
      if (ui.state) ui.state.textContent = "DEAD 💀 respawn...";
      respawnPlayer(player);
    }

    lastPlayerPos.copy(player.position);
  }

  return { start, stop, update };
}
