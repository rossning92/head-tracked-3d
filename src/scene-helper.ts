import {
  Color,
  FogExp2,
  PMREMGenerator,
  Scene,
  UnsignedByteType,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export function loadModel(scene: Scene, file: string) {
  const loader = new GLTFLoader();
  loader.load(file, function (gltf) {
    gltf.scene.scale.multiplyScalar(0.05);
    gltf.scene.position.z = 4;

    gltf.scene.rotation.y = -Math.PI / 2;
    scene.add(gltf.scene);
  });
}

export function loadEnvMap(renderer: WebGLRenderer, scene: Scene) {
  const pmremGenerator = new PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  new RGBELoader()
    .setDataType(UnsignedByteType)
    .load("quarry_01_1k.hdr", function (texture) {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;

      scene.background = envMap;
      scene.environment = envMap;

      texture.dispose();
      pmremGenerator.dispose();
    });
}

export function updateFog(scene: Scene) {
  const color = "black";

  if (!scene.fog) {
    scene.fog = new FogExp2(color, 0.05);
    scene.background = new Color(color);
  }
}
