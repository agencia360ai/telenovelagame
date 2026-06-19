import React, { useEffect, useRef } from "react";
import { StyleSheet, View, LogBox } from "react-native";
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer, loadAsync } from "expo-three";
import * as THREE from "three";
import { MODELS } from "../game/assets";

LogBox.ignoreLogs([/THREE.GLTFLoader: Couldn't load texture/]);

type Props = {
  /** require() asset number, MODELS key, or remote GLB URL. */
  source: number | string;
  /** "bust" = chest-up portrait crop, "full" = full body with grid. */
  mode?: "bust" | "full";
  /** Viewport width & height in dp. */
  size?: number;
  /** GL clear color (hex number). */
  bgColor?: number;
  /** Slow turntable rotation. */
  rotate?: boolean;
  /** Rim-light accent color (hex number). */
  rimColor?: number;
  /** Show circular border. */
  bordered?: boolean;
};

function resolveSource(source: number | string): number | { uri: string } {
  if (typeof source === "number") return source;
  const registered = MODELS[source];
  if (typeof registered === "number") return registered;
  if (typeof registered === "string" && registered) return { uri: registered };
  return { uri: source };
}

export function Avatar3D({
  source,
  mode = "bust",
  size = 120,
  bgColor = 0x0a0e1a,
  rotate = true,
  rimColor = 0x22d3ee,
  bordered = true,
}: Props) {
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;

    const realPixelStorei = gl.pixelStorei.bind(gl);
    gl.pixelStorei = function (pname: number, param: number) {
      if (pname === gl.UNPACK_ALIGNMENT || pname === gl.PACK_ALIGNMENT) {
        realPixelStorei(pname, param);
      }
    } as typeof gl.pixelStorei;

    const renderer = new Renderer({ gl });
    renderer.setSize(w, h);
    renderer.setClearColor(bgColor, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    if (mode === "full") scene.fog = new THREE.Fog(bgColor, 9, 22);

    const fov = mode === "bust" ? 30 : 45;
    const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);

    if (mode === "bust") {
      camera.position.set(0, 1.55, 3.0);
      camera.lookAt(0, 1.45, 0);
    } else {
      camera.position.set(0, 1.3, 5.5);
      camera.lookAt(0, 1.0, 0);
    }

    // Lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x303048, 1.0));

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 3, 4);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xbfd4ff, 0.4);
    fill.position.set(-3, 2, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(rimColor, 0.8);
    rim.position.set(-2, 3, -4);
    scene.add(rim);

    if (mode === "full") {
      scene.add(new THREE.GridHelper(20, 20, 0x22d3ee, 0x1e3a5f));
    }

    const clock = new THREE.Clock();
    let mixer: THREE.AnimationMixer | null = null;
    const pivot = new THREE.Group();
    scene.add(pivot);

    try {
      const gltf = await loadAsync(resolveSource(source));
      if (!mountedRef.current) return;

      const model: THREE.Object3D = gltf.scene ?? gltf;

      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mat && !mat.map && mat.color?.getHex() === 0xffffff) {
          mat.color = new THREE.Color(0x2a3f5f);
        }
      });

      let box = new THREE.Box3().setFromObject(model);
      const sz = box.getSize(new THREE.Vector3());
      if (sz.y > 0) model.scale.setScalar(2.2 / sz.y);

      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;

      pivot.add(model);

      if (gltf.animations?.length) {
        mixer = new THREE.AnimationMixer(model);
        const clip =
          gltf.animations.find(
            (a: THREE.AnimationClip) =>
              a.name.toLowerCase().includes("idle") &&
              !a.name.toLowerCase().includes("serious")
          ) ?? gltf.animations[0];
        mixer.clipAction(clip).play();
      }
    } catch {
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x33597f,
        emissive: rimColor,
        emissiveIntensity: 0.15,
        roughness: 0.5,
        metalness: 0.2,
      });
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 32, 32),
        headMat
      );
      head.position.y = mode === "bust" ? 1.6 : 2.0;
      pivot.add(head);

      if (mode === "full") {
        const torso = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.6, 1.0, 8, 24),
          new THREE.MeshStandardMaterial({
            color: 0x1e3a5f,
            roughness: 0.4,
            metalness: 0.3,
          })
        );
        torso.position.y = 1.0;
        pivot.add(torso);
      }
    }

    const baseY = pivot.position.y;

    const render = () => {
      if (!mountedRef.current) return;
      frameRef.current = requestAnimationFrame(render);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (mixer) mixer.update(delta);
      if (rotate) pivot.rotation.y += delta * 0.4;

      // Subtle breathing for static models
      if (!mixer) {
        pivot.position.y = baseY + Math.sin(elapsed * 1.5) * 0.015;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View
      style={[
        bordered ? styles.bordered : styles.plain,
        { width: size, height: size },
      ]}
    >
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  bordered: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(34, 211, 238, 0.4)",
  },
  plain: {
    overflow: "hidden",
  },
  gl: {
    flex: 1,
  },
});
