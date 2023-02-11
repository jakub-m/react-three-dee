// obj file from https://raw.githubusercontent.com/McNopper/OpenGL/master/Binaries/teapot.obj

import { vec3 } from "gl-matrix";
import { IFaceCollection } from "./rendering";
import { teapotObj } from "./teapot.obj";

export function getTeapot(): IFaceCollection {
  const vertices: vec3[] = [];
  const faceVertexIndices: [number, number, number][] = [];
  teapotObj.split("\n").forEach((line) => {
    // https://en.wikipedia.org/wiki/Wavefront_.obj_file
    line = line.trim();
    if (line.startsWith("v ")) {
      // process vertex
      const parts = line.split(" ");
      if (parts.length !== 4) {
        throw Error("Expected 4 parts: " + line);
      }
      const [a, b, c] = parts.slice(1, undefined).map(parseFloat);
      vertices.push(vec3.fromValues(a, b, c));
    }
    if (line.startsWith("f ")) {
      // process face
      const parts = line.split(" ");
      if (parts.length !== 4) {
        throw Error("Expected 4 parts: " + line);
      }
      const [i0, i1, i2] = parts.slice(1, undefined).map(
        (p) =>
          // indices are 1-based.
          parseInt(p.split("/")[0]) - 1
      );
      faceVertexIndices.push([i0, i1, i2]);
    }
  });
  return {
    vertices() {
      return vertices;
    },
    faceIndices() {
      return faceVertexIndices.map((_f, i) => i);
    },
    faceToVerticesIndex() {
      return faceVertexIndices;
    },
  };
}
