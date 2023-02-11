import { vec3 } from "gl-matrix";
import { IFaceCollection } from "./rendering";

/**
 * @param original - given face index, return the original collection and original face index.
 */
export interface IFaceCollectionGroup<T extends IFaceCollection>
  extends IFaceCollection {
  original(faceIndex: number): { coll: T; faceIndex: number };
}

/**
 * Group different face collections into one.
 */
export function group<T extends IFaceCollection>(
  colls: T[]
): IFaceCollectionGroup<T> {
  const faceIndex: {
    coll: T;
    originalFaceIndex: number;
    vii: [number, number, number];
  }[] = [];
  const vertices: vec3[] = [];
  colls.forEach((coll) => {
    const collVertices = coll.vertices();
    const collFaceToVertexMap = coll.faceToVerticesIndex();
    coll.faceIndices().forEach((fi) => {
      // flatten the vertices from all the collections into a single continuous map of vertices
      const k = vertices.length;
      vertices.push(...collFaceToVertexMap[fi].map((i) => collVertices[i]));
      faceIndex.push({
        coll,
        originalFaceIndex: fi,
        vii: [k + 0, k + 1, k + 2],
      });
    });
  });

  return {
    faceIndices() {
      return faceIndex.map((_, i) => i);
    },

    vertices() {
      return vertices;
    },

    faceToVerticesIndex() {
      return faceIndex.map((f) => f.vii);
    },

    original(fi) {
      const o = faceIndex[fi];
      return { coll: o.coll, faceIndex: o.originalFaceIndex };
    },
  };
}

export interface IPolygonStyle {
  fill?: string;
  stroke?: string;
}

export class Tetrahedron implements IFaceCollection {
  _vertices: vec3[];
  _faces: { style: IPolygonStyle; vix: [number, number, number] }[];

  constructor() {
    this._vertices = [
      [1, -1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, 1, 1],
    ];
    this._faces = [
      { vix: [0, 1, 2], style: { fill: "#f00", stroke: "black" } }, // red
      { vix: [0, 3, 1], style: { fill: "#0f0", stroke: "black" } }, // green
      { vix: [0, 2, 3], style: { fill: "#00f", stroke: "black" } }, // blue
      { vix: [3, 2, 1], style: { fill: "#fff", stroke: "black" } }, // white
    ];
  }

  styles(): IPolygonStyle[] {
    return this._faces.map((f) => f.style);
  }

  faceIndices(): number[] {
    return [0, 1, 2, 3];
  }

  vertices(): vec3[] {
    return this._vertices;
  }

  faceToVerticesIndex(): [number, number, number][] {
    return this._faces.map((f) => f.vix);
  }

  move(x: number, y: number, z: number): Tetrahedron {
    this._vertices.forEach((v, i) => {
      vec3.add(this._vertices[i], this._vertices[i], vec3.fromValues(x, y, z));
    });
    return this;
  }
}

export interface IStyledFace {
  vertices(): [vec3, vec3, vec3];
  style(): IPolygonStyle;
}

const defaultStyle: IPolygonStyle = { fill: "#ff0", stroke: "black" };

export function newStyledFace(
  vertices: [vec3, vec3, vec3],
  style: IPolygonStyle = {}
): IStyledFace {
  const _style = { ...defaultStyle, ...style };
  return {
    vertices() {
      return vertices;
    },
    style() {
      return _style;
    },
  };
}

export function newFaceCollection(faces: Array<IStyledFace>): IFaceCollection {
  return {
    faceIndices() {
      return faces.map((_face, i) => i);
    },

    vertices() {
      const vertices = new Array<vec3>(faces.length * 3);
      faces.forEach((_face, fi) => {
        const [v0, v1, v2] = faces[fi].vertices();
        vertices[fi * 3 + 0] = v0;
        vertices[fi * 3 + 1] = v1;
        vertices[fi * 3 + 2] = v2;
      });
      return vertices;
    },

    faceToVerticesIndex() {
      return faces.map((_face, i) => [i * 3 + 0, i * 3 + 1, i * 3 + 2]);
    },
  };
}
