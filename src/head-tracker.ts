import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";

const filterPose = true;

function distance(a: number[], b: number[]) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

async function setupWebcam(): Promise<HTMLVideoElement> {
  const video = document.createElement("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true,
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();

      resolve(video);
    };
  });
}

export class HeadTracker {
  model: faceLandmarksDetection.FaceLandmarksDetector;
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  ctx: CanvasRenderingContext2D;

  ipd: number = 100;
  centralPupil: number[] = [0, 0];

  constructor() {
    const p1 = tf.setBackend("webgl").then(() => {
      return faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        { maxFaces: 1 }
      );
    });

    const p2 = setupWebcam();

    Promise.all([p1, p2]).then(([model, video]) => {
      this.model = model;
      this.video = video;

      this.canvas = document.createElement("canvas");
      this.canvas.id = "webcam";
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
      document.body.appendChild(this.canvas);

      const CYAN = "#32EEDB";
      this.ctx = this.canvas.getContext("2d");
      this.ctx.fillStyle = CYAN;
      this.ctx.strokeStyle = CYAN;
      this.ctx.lineWidth = 0.5;

      this.render();
    });
  }

  async render() {
    const NUM_KEYPOINTS = 468;
    const NUM_IRIS_KEYPOINTS = 5;

    const predictions = await this.model.estimateFaces({
      input: this.video,
      returnTensors: false,
      flipHorizontal: false,
      predictIrises: true,
    });

    this.ctx.save();
    this.ctx.translate(this.canvas.width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(
      this.video,
      0,
      0,
      this.video.videoWidth,
      this.video.videoHeight,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    if (predictions.length > 0) {
      const keypoints = predictions[0].scaledMesh as any;

      if (keypoints.length > NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS) {
        this.ctx.lineWidth = 1;

        const leftCenter = keypoints[NUM_KEYPOINTS];
        const leftDiameterY = distance(
          keypoints[NUM_KEYPOINTS + 4],
          keypoints[NUM_KEYPOINTS + 2]
        );
        const leftDiameterX = distance(
          keypoints[NUM_KEYPOINTS + 3],
          keypoints[NUM_KEYPOINTS + 1]
        );

        this.ctx.beginPath();
        this.ctx.ellipse(
          leftCenter[0],
          leftCenter[1],
          leftDiameterX / 2,
          leftDiameterY / 2,
          0,
          0,
          2 * Math.PI
        );
        this.ctx.stroke();

        const rightCenter = keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS];
        const rightDiameterY = distance(
          keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 2],
          keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 4]
        );
        const rightDiameterX = distance(
          keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 3],
          keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 1]
        );

        this.ctx.beginPath();
        this.ctx.ellipse(
          rightCenter[0],
          rightCenter[1],
          rightDiameterX / 2,
          rightDiameterY / 2,
          0,
          0,
          2 * Math.PI
        );
        this.ctx.stroke();

        if (1) {
          // IPD
          let ipd = Math.sqrt(
            (leftCenter[0] - rightCenter[0]) ** 2 +
              (leftCenter[1] - rightCenter[1]) ** 2
          );
          if (filterPose) {
            ipd = this.ipd * 0.9 + ipd * 0.1;
          }
          this.ipd = ipd;

          let centerX =
            (((leftCenter[0] + rightCenter[0]) * 0.5) / this.video.videoWidth) *
              2 -
            1;
          let centerY =
            (((leftCenter[1] + rightCenter[1]) * 0.5) /
              this.video.videoHeight) *
              2 -
            1;

          if (filterPose) {
            centerX = this.centralPupil[0] * 0.5 + centerX * 0.5;
            centerY = this.centralPupil[1] * 0.5 + centerY * 0.5;
          }

          this.centralPupil[0] = centerX;
          this.centralPupil[1] = centerY;
        }
      }
    }

    this.drawInfo();

    requestAnimationFrame(this.render.bind(this));
  }

  private drawInfo() {
    this.ctx.restore();

    const fontSize = 36;
    this.ctx.font = `${fontSize}px arial`;
    this.ctx.textAlign = "center";

    this.ctx.fillText(
      `IPD=${this.ipd.toFixed()}`,
      this.canvas.width * 0.5,
      fontSize
    );

    this.ctx.fillText(
      `CentralPupil=(${this.centralPupil[0].toFixed(
        2
      )}, ${this.centralPupil[1].toFixed(2)})`,
      this.canvas.width * 0.5,
      fontSize * 2
    );
  }
}
