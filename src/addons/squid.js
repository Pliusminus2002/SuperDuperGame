// src/addons/squid.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
console.log("SQUID ADDON NEW FILE LOADED");
alert("NEW SQUID ADDON LOADED");

export function createSquidAddon() {

  let enabled = false;
  let root = null;
  let arenaFloor = null;

  let ui = { box:null, state:null, timer:null };

  let phase = "idle";
  let phaseT = 0;
  let timeLeft = 60;

  let doll = null;
  let dollWatching = false;

  let playerRef = null;
  let lastPlayerPos = new THREE.Vector3();

  const moveThreshold = 0.02;

  const ARENA_X = 1000;
  const ARENA_Z = 0;
  const ARENA_RADIUS = 26;

  const START_Z = 18;
  const FINISH_Z = -18;


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
      background:rgba(0,0,0,0.6);
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

    ui = { box:null, state:null, timer:null };
  }



  function createArena(scene) {

    root = new THREE.Group();

    root.name = "SquidArenaRoot";



    // ARENOS GRINDYS

    const floorGeo = new THREE.CircleGeometry(ARENA_RADIUS,64);

    const floorMat = new THREE.MeshStandardMaterial({
      color:0xd9c27a
    });

    arenaFloor = new THREE.Mesh(floorGeo,floorMat);

    arenaFloor.rotation.x = -Math.PI/2;

    arenaFloor.position.set(ARENA_X,0,ARENA_Z);

    arenaFloor.receiveShadow = true;

    root.add(arenaFloor);



    // START LINIJA

    const startLine = new THREE.Mesh(

      new THREE.BoxGeometry(12,0.02,0.5),

      new THREE.MeshBasicMaterial({color:0x00ff88})

    );

    startLine.position.set(ARENA_X,0.03,START_Z);

    root.add(startLine);



    // FINISH LINIJA

    const finishLine = new THREE.Mesh(

      new THREE.BoxGeometry(12,0.02,0.5),

      new THREE.MeshBasicMaterial({color:0xff3355})

    );

    finishLine.position.set(ARENA_X,0.03,FINISH_Z);

    root.add(finishLine);



    // LĖLĖ

    doll = new THREE.Mesh(

      new THREE.BoxGeometry(2,4,2),

      new THREE.MeshStandardMaterial({color:0xffaa88})

    );

    doll.position.set(ARENA_X,2,-22);

    root.add(doll);



    scene.add(root);
  }



  function clearArena(scene) {

    if (!root) return;

    scene.remove(root);

    root.traverse(obj=>{

      if (obj.geometry) obj.geometry.dispose?.();

      if (obj.material) {

        if (Array.isArray(obj.material)) {

          obj.material.forEach(m=>m.dispose?.());

        }

        else {

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

    if (phase==="green") ui.state.textContent="🟢 GREEN LIGHT";

    else if (phase==="red") ui.state.textContent="🔴 RED LIGHT";

    else if (phase==="dead") ui.state.textContent="💀 PRALAIMĖJAI";

    else if (phase==="finished") ui.state.textContent="🏆 LAIMĖJAI";

    else ui.state.textContent="Squid Game";
  }



  function start({scene,player}) {

    if (root) clearArena(scene);

    removeUI();

    enabled=true;

    playerRef=player;

    phase="green";

    phaseT=0;

    timeLeft=60;

    dollWatching=false;



    createArena(scene);

    createUI();



    if (playerRef) {

      lastPlayerPos.copy(playerRef.position);

    }



    setStateText();



    if (ui.timer) {

      ui.timer.textContent=`Laikas: ${Math.ceil(timeLeft)}`;

    }

  }



  function stop(scene) {

    enabled=false;

    removeUI();

    if (scene) clearArena(scene);

  }



  function update(delta,{scene,player}) {

    if (!enabled || !player) return null;



    phaseT += delta;

    timeLeft -= delta;



    if (ui.timer) {

      ui.timer.textContent=`Laikas: ${Math.max(0,Math.ceil(timeLeft))}`;

    }



    if (phase==="green" && phaseT>=3) {

      phase="red";

      phaseT=0;

      dollWatching=true;

      setStateText();

    }

    else if (phase==="red" && phaseT>=2) {

      phase="green";

      phaseT=0;

      dollWatching=false;

      setStateText();

    }



    // LĖLĖ SUKASI

    if (doll) {

      if (dollWatching) {

        doll.rotation.y = THREE.MathUtils.lerp(doll.rotation.y,Math.PI,0.1);

      }

      else {

        doll.rotation.y = THREE.MathUtils.lerp(doll.rotation.y,0,0.1);

      }

    }



    // JUDĖJIMO TIKRINIMAS

    if (phase==="red") {

      const moved = player.position.distanceTo(lastPlayerPos) > moveThreshold;

      if (moved) {

        phase="dead";

        setStateText();

        enabled=false;

        return "dead";

      }

    }



    lastPlayerPos.copy(player.position);



    // FINISH

    const inFinishZone =

      Math.abs(player.position.x-ARENA_X)<6 &&

      player.position.z<=FINISH_Z;



    if (inFinishZone) {

      phase="finished";

      setStateText();

      enabled=false;

      return "win";

    }



    if (timeLeft<=0) {

      phase="dead";

      setStateText();

      enabled=false;

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