# 3D models

The live 3D officer in the lobby is rendered with Three.js (`expo-gl` +
`expo-three`). Right now it's a primitive stand-in (`src/components/OfficerScene3D.tsx`).

## Use a real character model

React Native / Three.js loads **GLB** reliably — not FBX. Convert first:

1. **FBX → GLB** (embeds textures into one file):
   - Blender: `File ▸ Import ▸ FBX`, then `File ▸ Export ▸ glTF 2.0 (.glb)`,
     with **Format: glTF Binary (.glb)**. This bakes the external PNG textures
     into the file so there are no missing-texture issues on device.
   - Or CLI: `npx @gltf-transform/cli copy in.fbx out.glb` (for already-glTF
     assets) / `FBX2glTF -b -i Berserker_01.fbx -o officer.glb`.
2. Drop `officer.glb` in this folder.
3. Register it in `src/game/assets.ts`:
   ```ts
   export const MODELS = { officer: require("../../assets/models/officer.glb") };
   ```
4. Load it in `OfficerScene3D.tsx` with `GLTFLoader` from
   `three/examples/jsm/loaders/GLTFLoader` (+ `expo-asset` to resolve the
   bundled file to a URI), add it to the scene, and drive its animation clip
   with a `THREE.AnimationMixer`.

Keep models lightweight for mobile: ≤ ~5 MB, ≤ ~50k triangles, textures ≤ 1024px.
