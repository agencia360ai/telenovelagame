import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer, loadAsync } from "expo-three";
import * as THREE from "three";

const MODEL_ASSET = require("../../assets/models/officer.glb");

export function OfficerScene3D() {
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    // EXGL only supports the alignment params of gl.pixelStorei(); three.js
    // calls it with WebGL-only params (FLIP_Y, PREMULTIPLY_ALPHA, …) on every
    // texture upload, which floods the log with warnings. Silently drop the
    // unsupported ones — EXGL ignored them anyway.
    const realPixelStorei = gl.pixelStorei.bind(gl);
    gl.pixelStorei = function (pname: number, param: number) {
      if (pname === gl.UNPACK_ALIGNMENT || pname === gl.PACK_ALIGNMENT) {
        realPixelStorei(pname, param);
      }
    } as typeof gl.pixelStorei;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(0x0a0e1a, 1);
    // Render textures in sRGB so the model's colors look correct (not dark).
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0e1a, 9, 22);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.3, 5.5);
    camera.lookAt(0, 1.0, 0);

    // Neutral lighting so the character shows its real textures, with just a
    // subtle cyan rim for the command-center mood.
    const hemi = new THREE.HemisphereLight(0xffffff, 0x303048, 1.1);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(2, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbfd4ff, 0.5);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 0.7);
    rimLight.position.set(-2, 3, -4);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(20, 20, 0x22d3ee, 0x1e3a5f);
    grid.position.y = 0;
    scene.add(grid);

    const clock = new THREE.Clock();
    let mixer: THREE.AnimationMixer | null = null;
    // Pivot lets us spin the model around its own vertical center.
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Try loading the real GLB model; fall back to primitives if it fails.
    try {
      const gltf = await loadAsync(MODEL_ASSET);
      const model: THREE.Object3D = gltf.scene ?? gltf;

      // Normalize to ~2.2 units tall.
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      if (size.y > 0) {
        model.scale.setScalar(2.2 / size.y);
      }

      // Center horizontally on the pivot, feet on the grid (y = 0).
      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;

      pivot.add(model);

      // Play the idle animation if present.
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const idleClip =
          gltf.animations.find(
            (a: THREE.AnimationClip) =>
              a.name.toLowerCase().includes("idle") &&
              !a.name.toLowerCase().includes("serious")
          ) ?? gltf.animations[0];
        mixer.clipAction(idleClip).play();
      }
    } catch {
      // Fallback: primitive stand-in
      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xd9a679,
        roughness: 0.6,
        metalness: 0.1,
      });
      const uniformMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a5f,
        roughness: 0.4,
        metalness: 0.3,
      });
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        skinMat
      );
      head.position.y = 2.0;
      pivot.add(head);
      const torso = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.65, 1.1, 8, 24),
        uniformMat
      );
      torso.position.y = 1.0;
      pivot.add(torso);
      const badge = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 24),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.8,
        })
      );
      badge.position.set(0.28, 1.35, 0.62);
      pivot.add(badge);
    }

    const render = () => {
      frameRef.current = requestAnimationFrame(render);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      pivot.rotation.y += delta * 0.5; // slow turntable
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={styles.container}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  gl: {
    flex: 1,
  },
});
