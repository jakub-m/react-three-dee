import { vec3, mat4 } from "gl-matrix";
import { loggableObject } from "./debug";

export interface ICamera {
  // clipMatrix(): mat4;
  modelViewMatrix(): mat4;
  projectionMatrix(): mat4;
  copy(): ICamera;
  /** Rotate around camera local coordinate system. */
  rotate(x: number, y: number): void;
  move(x: number, y: number, z: number): void;
  pos(): { x: number; y: number; z: number };
  angleDeg(): { x: number; y: number; z: number };

  // debug
  debugForward(): vec3;
}

export function newCamera(args: {
  aspect: number;
  eye?: vec3;
  rotation?: vec3;
}): ICamera {
  const eye = args.eye || vec3.fromValues(0, 0, 0);
  const eyeRotation = args.rotation || vec3.fromValues(0, 0, 0);
  const [near, far] = [10, 20];
  const fov = Math.PI / 3;
  const aspect = args.aspect;
  const _projectionMat = mat4.perspective(
    mat4.create(),
    fov,
    aspect,
    near,
    far
  );

  return {
    modelViewMatrix() {
      const xRotMat = mat4.rotateX(
        mat4.create(),
        mat4.create(),
        eyeRotation[0]
      );
      const yRotMat = mat4.rotateY(
        mat4.create(),
        mat4.create(),
        eyeRotation[1]
      );
      const rotMat = mat4.multiply(mat4.create(), yRotMat, xRotMat);

      const forward = vec3.fromValues(0, 0, 1); // look toward negative axis
      vec3.transformMat4(forward, forward, rotMat);
      vec3.add(forward, forward, eye);

      const up = vec3.fromValues(0, -1, 0);
      vec3.transformMat4(up, up, rotMat);

      const mv = mat4.lookAt(mat4.create(), eye, forward, up);
      return mv;

      //return mat4.multiply(mat4.create(), _projectionMat, mv);
    },

    projectionMatrix() {
      return _projectionMat;
    },

    debugForward() {
      const xRotMat = mat4.rotateX(
        mat4.create(),
        mat4.create(),
        eyeRotation[0]
      );
      const yRotMat = mat4.rotateY(
        mat4.create(),
        mat4.create(),
        eyeRotation[1]
      );
      const rotMat = mat4.multiply(mat4.create(), yRotMat, xRotMat);

      const forward = vec3.fromValues(0, 0, -1); // look toward negative axis
      vec3.transformMat4(forward, forward, rotMat);
      vec3.add(forward, forward, eye);
      return forward;
    },

    copy() {
      return newCamera({ aspect: aspect, eye: eye, rotation: eyeRotation });
    },

    rotate(radX, radY) {
      eyeRotation[0] += radX;
      eyeRotation[1] -= radY;
    },

    move(x, y, z) {
      const xRotMat = mat4.rotateX(
        mat4.create(),
        mat4.create(),
        eyeRotation[0]
      );
      const yRotMat = mat4.rotateY(
        mat4.create(),
        mat4.create(),
        eyeRotation[1]
      );
      const zRotMat = mat4.rotateZ(
        mat4.create(),
        mat4.create(),
        eyeRotation[2]
      );

      const rotMat = mat4.create();
      mat4.multiply(rotMat, yRotMat, xRotMat);
      mat4.multiply(rotMat, zRotMat, rotMat);

      const dv = vec3.fromValues(x, y, z);
      vec3.transformMat4(dv, dv, rotMat);

      vec3.add(eye, eye, dv);
    },

    pos() {
      const [x, y, z] = eye;
      return { x, y, z };
    },

    angleDeg() {
      const [x, y, z] = eyeRotation.map((r) => (r / Math.PI) * 180);
      return { x, y, z };
    },
  };
}

/**
 * @param frontOnly render only faces facing towards the camera.
 */
export interface mapRenderableVerticesP<R> {
  camera: ICamera;
  faceCollection: IFaceCollection;
  width: number;
  height: number;
  frontOnly?: boolean;
  onFace: (item: FaceIteratorItem) => R;
}

/**
 * Collection of faces. Coordintes of the faces are in local space.
 * Coordinates of the FaceCollection are in the world space, or relative to
 * the encompassing container.
 * @method faces List of faces.
 * @method faceIndices List of indices of faces.
 * @method vertices List of vertices.
 * @method faceToVerticesIndex List that maps faces to vertices, by indices in faces and vertices list.
 */
export interface IFaceCollection {
  faceIndices(): number[];
  vertices(): vec3[];
  faceToVerticesIndex(): [number, number, number][];
}

export type FaceIteratorItem = {
  index: number;
  vertices: [vec3, vec3, vec3];
  isFront: boolean;
};

export function mapRenderableVertices<R>({
  camera,
  faceCollection,
  width,
  height,
  onFace,
  frontOnly = true,
}: mapRenderableVerticesP<R>): R[] {
  const faceToVerticesIndex = faceCollection.faceToVerticesIndex();
  const mv = camera.modelViewMatrix();
  const proj = camera.projectionMatrix();

  // Project vertices to model-view space
  let vertices = faceCollection.vertices().map((v) => {
    return vec3.transformMat4(vec3.create(), v, mv);
  });

  // // console.log(vertices.map((v) => v[2].toFixed(2)));
  let indices = faceCollection.faceIndices();

  indices = indices.filter((fi) => {
    const [a, b, c] = faceToVerticesIndex[fi];
    // Check if faces are in front of the camer, that is, if Z is positive.
    // I suppose that I should not need this step, it all should work with checking clip space only,
    // but it seems I have a a bug and clip space shows weird values on Z.
    const ok = (v: vec3) => v[2] > 0;
    return ok(vertices[a]) || ok(vertices[b]) || ok(vertices[c]);
  });

  // Now the vertice should be in clip space. I might do something wrong, because Z is not in (-1, 1).
  vertices = vertices.map((v) => {
    return vec3.transformMat4(vec3.create(), v, proj);
  });

  indices = indices.filter((fi) => {
    // If at least one of the vertices of the face is within clip space,
    // then whole face is renderable. Otherwise, will skip that face
    // during rendering, by marking the index as -1.
    const [a, b, c] = faceToVerticesIndex[fi];

    const ok = (p: vec3) => {
      let [x, y, z] = p;
      //return x >= -1 && x <= 1 && y >= -1 && y <= 1 && z >= -1 && z <= 1;
      // Something is wrong with projection, z is most often > 1
      return x >= -1 && x <= 1 && y >= -1 && y <= 1 && z >= -1;
    };
    return ok(vertices[a]) || ok(vertices[b]) || ok(vertices[c]);
  });

  const isFrontFaceList = indices.map((fi) => {
    const [a, b, c] = faceToVerticesIndex[fi];
    return isFrontFace(vertices[a], vertices[b], vertices[c]);
  });

  if (frontOnly) {
    indices = indices.filter((fi) => isFrontFaceList[fi]);
  }

  // After this step, vertices are not in clip space anymore but
  // x and y is scaled to screen size
  vertices.forEach((v, i) => {
    const w = vec3.fromValues(
      ((v[0] + 1) * width) / 2,
      ((v[1] + 1) * height) / 2,
      v[2]
    );
    vertices[i] = w;
  });

  indices.sort((fiA, fiB) => {
    const [va0, va1, va2] = faceToVerticesIndex[fiA];
    const [vb0, vb1, vb2] = faceToVerticesIndex[fiB];
    return compareTriangleZOrder(
      [vertices[va0], vertices[va1], vertices[va2]],
      [vertices[vb0], vertices[vb1], vertices[vb2]]
    );
  });

  return indices.map((fi) => {
    const [a, b, c] = faceToVerticesIndex[fi];
    return onFace({
      index: fi,
      vertices: [vertices[a], vertices[b], vertices[c]],
      isFront: isFrontFaceList[fi],
    });
  });
}

function isFrontFace(p1: vec3, p2: vec3, p3: vec3): boolean {
  // https://stackoverflow.com/a/23709352/497208
  const a = vec3.sub(vec3.create(), p1, p2);
  const b = vec3.sub(vec3.create(), p2, p3);
  const n = vec3.cross(vec3.create(), a, b);
  // console.log("" + n);
  return n[2] > 0;
}

function compareTriangleZOrder(
  a: [vec3, vec3, vec3],
  b: [vec3, vec3, vec3]
): number {
  const az0 = a[0][2];
  const az1 = a[1][2];
  const az2 = a[2][2];
  const bz0 = b[0][2];
  const bz1 = b[1][2];
  const bz2 = b[2][2];
  // z*3 of centroids
  return az0 + az1 + az2 - (bz0 + bz1 + bz2);
}
