/**
 * Useful materials:
 * - https://learnopengl.com/Getting-started/Coordinate-Systems
 * - https://math.hws.edu/graphicsbook/c7/s1.html#webgl3d.1.2
 */

// local space
// world space
// view space
// clip space

import './App.css';
import { useState, useEffect, FC} from 'react';
import { vec3 } from 'gl-matrix'
import { ICamera, newCamera, mapRenderableVertices, FaceIteratorItem } from './rendering';
import { newStyledFace, newFaceCollection, Tetrahedron, IPolygonStyle, group } from './objects';
import { getTeapot } from './teapot';

const round = Math.round

function App() {
  return (
    <View />
  );
}

function View({width=640, height=480}) {
  const mouseSensitvity = 1/40

  //  const t1 = new Tetrahedron().move( 2, 0, 0)//.scale(2)
  //  const t2 = new Tetrahedron().move(-2, 0, 0)//.scale(1)
  //  const t3 = new Tetrahedron().move( 2, 2, 0)//.scale(2)
  //  const t4 = new Tetrahedron().move(-2, 2, 0)//.scale(1)
  //  const renderable = group([t1, t2, t3, t4])
  // //const renderable = t1
  
  // const faces = [
    // newStyledFace([[0, 0, 10], [1, 2, 10], [2, 0, 10]], {fill: "red"}), // cw front, both point down
    // newStyledFace([[2, 0,  0], [1, 2,  0], [0, 0,  0]], {fill: "green"}), // ccw back
  // ]
  // const renderable = newFaceCollection(faces)
  const renderable = getTeapot()

  const [camera, setCamera] = useState(newCamera({
    aspect: width/height, eye: [0, 0, 8]
  }))

  useMouseMoved((pos, posDiff) => {
    setCamera(camera => {
      const newCamera = camera.copy()
      newCamera.rotate(posDiff.dy / Math.PI * mouseSensitvity, posDiff.dx / Math.PI * mouseSensitvity)
      return newCamera
    })
  })

  useMoveOnKeyboard(setCamera, 0.15, 60)

  const onFace = ({index, vertices, isFront}: FaceIteratorItem): JSX.Element => {
    // const texts = vertices.map((v, i) => 
    //   <text key={"t_" + index + "_" + i} x={round(v[0])} y={round(v[1])} style={{fontSize: 12}}>
    //     ({round(v[0])}, {round(v[1])}, {v[2].toFixed(2)})
    //   </text>
    // )

    //const o = renderable.original(index)
    const style = {fill: 'yellow', stroke: 'black'}
    //const style1 = o.coll.styles()[o.faceIndex]
    //const style1 = faces[index].style()
    //const style2 = isFront ? {} : {fill: "#666"}
    //// const style2 = {}
    //const style = {...style1, ...style2}
    return (
      <>
        <FaceSvg key={index} triangle={vertices} style={style} />
        {/* {texts} */}
      </>
    )
  }

  const svgFaces = mapRenderableVertices<JSX.Element>({
    camera,
    faceCollection: renderable,
    width,
    height,
    onFace,
  })

  const _forward = camera.debugForward()
  return (
    <>
    <div id="mainView" className="mainView" >
      <svg width={width} height={height} style={{backgroundColor: "#ccc"}}>
        {svgFaces}
      </svg>
    </div>
    <div>
      camera pos = {round(camera.pos().x)}, &nbsp; {round(camera.pos().y)}, &nbsp; {round(camera.pos().z)} &nbsp;
      ang = {round(camera.angleDeg().x)}, &nbsp; {round(camera.angleDeg().y)}, &nbsp; {round(camera.angleDeg().z)} &nbsp;
      forward = {_forward[0].toFixed(1)}, &nbsp;  {_forward[1].toFixed(1)}, &nbsp;  {_forward[2].toFixed(1)} &nbsp; 
    </div>
    </>
  )
}

type FaceSvgP = {
  triangle: [vec3, vec3, vec3]
  style?: IPolygonStyle
}

const FaceSvg: FC<FaceSvgP> = ({triangle, style}) => {
  // the triangle should be already in viewport space, not in clip space
  const [ax, ay] = [round(triangle[0][0]), round(triangle[0][1])]
  const [bx, by] = [round(triangle[1][0]), round(triangle[1][1])]
  const [cx, cy] = [round(triangle[2][0]), round(triangle[2][1])]
  const points = ax+","+ay + " " + bx+","+by + " " + cx+","+cy
  return (
    <polygon points={points} fill={style?.fill} stroke={style?.stroke}/>
    // <polygon points={points} fill={style?.fill} />
  )
}

type XY = {x: number, y: number}
type DXY = {dx: number, dy: number}
type UseMouseMovedCallback = (pos: XY, posDiff: DXY) => void;

function useMouseMoved(onMouseMoved: UseMouseMovedCallback) {
  const [mousePos, setMousePos] = useState<XY | null>(null)
  const [mousePosDiff, setMousePosDiff] = useState<DXY | null>(null)
  useEffect(() => {
    const listener = ({clientX, clientY}: MouseEvent) => {
      setMousePos((prev) => {
        const newPos = {x: clientX, y: clientY}
        let newPosDiff = {dx: 0, dy: 0}
        if (prev) {
          newPosDiff = {dx: clientX - prev.x, dy: clientY - prev.y}
        }
        if (onMouseMoved) {
          onMouseMoved(newPos, newPosDiff)
        }
        setMousePosDiff(newPosDiff)
        return newPos
      })
    }
    window.addEventListener("mousemove", listener)
    return () => {
      window.removeEventListener("mousemove", listener)
    }
  }, [onMouseMoved])
  return [mousePos, mousePosDiff]
}

type setter<T> = (value: (prev: T) => T) => void

function useMoveOnKeyboard(setCamera: setter<ICamera>, delta: number, fps: number) {
  const [counter, setCounter] = useState(0)
  const keys = useKeyHandlers()
  useEffect(() => {
    const timeout = setTimeout(() => {
      setCamera((prev)  => {
        let dx = (keys.has("a") ? -delta : 0) + (keys.has("d") ? delta : 0)
        let dy = (keys.has("e") ? -delta : 0) + (keys.has("q") ? delta : 0)
        let dz = (keys.has("w") ? -delta : 0) + (keys.has("s") ? delta : 0)
        if (dx || dy || dz) {
          const newCamera = prev.copy()
          newCamera.move(dx, dy, dz)
          return newCamera
        } else {
          return prev
        }
      })
      setCounter((c) => c + 1)
   }, 1000 / fps)

   return () => {
     clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter])
}

function useKeyHandlers() {
  const [keysDown, setKeysDown] = useState(new Set())

  const keyDownHandler = ({key}: KeyboardEvent) => {
      setKeysDown(keys => {
        keys = new Set(keys)
        keys.add(key)
        return keys
      })
    }
  
    const keyUpHandler = ({key}: KeyboardEvent) => {
      setKeysDown(keys => {
        keys = new Set(keys)
        keys.delete(key)
        return keys
      })
    }

  useEffect(() => {
    window.addEventListener('keydown', keyDownHandler)
    window.addEventListener('keyup', keyUpHandler)
    return () => {
      window.removeEventListener('keydown', keyDownHandler)
      window.removeEventListener('keyup', keyUpHandler)
    }
  }, [])

  return keysDown
}

export default App;