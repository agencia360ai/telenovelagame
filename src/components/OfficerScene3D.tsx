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

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(0x0a0e1a, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0e1a, 8, 20);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 5.2);
    camera.lookAt(0, 1.1, 0);

    const ambient = new THREE.AmbientLight(0x4060a0, 0.7);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x22d3ee, 1.6);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.1);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(20, 20, 0x22d3ee, 0x1e3a5f);
    grid.position.y = 0;
    scene.add(grid);

    const clock = new THREE.Clock();
    let mixer: THREE.AnimationMixer | null = null;

    // Try loading the real GLB model; fall back to primitives if it fails.
    try {
      const gltf = await loadAsync(MODEL_ASSET);
      const model = gltf.scene ?? gltf;
      model.position.set(0, 0, 0);

      // Auto-scale: normalize to ~2 units tall
      const box = new THREE.Box3().setFromObject(model);
      const height = box.max.y - box.min.y;
      if (height > 0) {
        const scale = 2.2 / height;
        model.scale.setScalar(scale);
        // Recompute after scaling
        box.setFromObject(model);
        model.position.y = -box.min.y;
      }

      scene.add(model);

      // Play the idle animation if available
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const idleClip =
          gltf.animations.find(
            (a: THREE.AnimationClip) =>
              a.name.toLowerCase().includes("idle") &&
              !a.name.toLowerCase().includes("serious")
          ) ?? gltf.animations[0];
        const action = mixer.clipAction(idleClip);
        action.play();
      }
    } catch {
      // Fallback: primitive stand-in
      const officer = new THREE.Group();
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
      officer.add(head);
      const torso = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.65, 1.1, 8, 24),
        uniformMat
      );
      torso.position.y = 1.0;
      officer.add(torso);
      const badge = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 24),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.8,
        })
      );
      badge.position.set(0.28, 1.35, 0.62);
      officer.add(badge);
      scene.add(officer);
    }

    const render = () => {
      frameRef.current = requestAnimationFrame(render);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
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
