import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";

/**
 * OfficerScene3D — increment 1 of the 3D pipeline.
 *
 * Renders a live Three.js scene through expo-gl (which IS bundled in
 * Expo Go SDK 54). For now it draws a stylized "officer" stand-in built
 * from primitives so we can confirm real-time 3D actually renders on
 * the device before we load the real character model (FBX -> GLB).
 */
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
    scene.fog = new THREE.Fog(0x0a0e1a, 6, 16);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 5.2);
    camera.lookAt(0, 1.1, 0);

    // Lighting — cool command-center rim + warm key
    const ambient = new THREE.AmbientLight(0x4060a0, 0.7);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x22d3ee, 1.6);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.1);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    // Officer stand-in (head + torso) grouped so it reads as a figure
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

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), skinMat);
    head.position.y = 2.0;
    officer.add(head);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.65, 1.1, 8, 24),
      uniformMat
    );
    torso.position.y = 1.0;
    officer.add(torso);

    // Glowing badge accent
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

    // Floor grid for the "console" feel
    const grid = new THREE.GridHelper(20, 20, 0x22d3ee, 0x1e3a5f);
    grid.position.y = 0.2;
    scene.add(grid);

    const render = () => {
      frameRef.current = requestAnimationFrame(render);
      officer.rotation.y += 0.01;
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
