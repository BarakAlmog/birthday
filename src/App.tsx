import { useEffect, useRef, useState } from 'react'
import {
  Engine,
  Render,
  Bodies,
  Composite,
  Runner,
  Mouse,
  MouseConstraint,
  Constraint,
  Events,
  Vector,
  Body,
} from 'matter-js'
import './App.css'
import makeImg from './assets/Make.png'
import num1 from './assets/numbers/1.png'
import num2 from './assets/numbers/2.png'
import num3 from './assets/numbers/3.png'
import num4 from './assets/numbers/4.png'
import num5 from './assets/numbers/5.png'
import num6 from './assets/numbers/6.png'
import num7 from './assets/numbers/7.png'
import num8 from './assets/numbers/8.png'
import num9 from './assets/numbers/9.png'
import num10 from './assets/numbers/10.png'

declare module 'matter-js' {
  interface IChamferableBodyDefinition {
    blockNumber?: number
  }
}

function App() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(0)
  const [hasShot, setHasShot] = useState(false)

  useEffect(() => {
    if (!sceneRef.current) return

    // Create engine and renderer
    const engine = Engine.create()
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: `url(./images/bg.svg) center center / cover no-repeat`,
        pixelRatio: 1,
      },
    })

    // Create ground
    const ground = Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight - 30,
      window.innerWidth,
      60,
      {
        isStatic: true,
        render: {
          fillStyle: '#000000', // Make ground black
        },
      }
    )

    // Create pyramid boxes (moved to the right)
    const pyramid = [] as Matter.Body[]
    const rows = 10
    const boxSize = 40
    const startX = window.innerWidth * 0.75
    const startY = window.innerHeight - 120

    // Create number images map
    const numberImages = {
      1: num1,
      2: num2,
      3: num3,
      4: num4,
      5: num5,
      6: num6,
      7: num7,
      8: num8,
      9: num9,
      10: num10,
    }

    for (let row = 0; row < rows; row++) {
      const rowBoxes = rows - row
      for (let col = 0; col < rowBoxes; col++) {
        const randomNumber = Math.floor(Math.random() * 10) + 1
        const box = Bodies.rectangle(
          startX - (rowBoxes * boxSize) / 2 + col * boxSize + boxSize / 2,
          startY - row * boxSize,
          boxSize - 4,
          boxSize - 4,
          {
            chamfer: { radius: 4 },
            render: {
              sprite: {
                texture: numberImages[randomNumber as keyof typeof numberImages],
                xScale: (boxSize - 4) / 300,
                yScale: (boxSize - 4) / 300,
              },
            },
            blockNumber: randomNumber,
          }
        )
        pyramid.push(box)
      }
    }

    // Create ball on the left (elevated position)
    const ballX = window.innerWidth * 0.2
    const ballY = window.innerHeight - 280 // Elevated position without tower
    const ball = Bodies.circle(ballX, ballY, 40, {
      restitution: 0.8,
      render: {
        sprite: {
          texture: makeImg,
          xScale: 150 / 512,
          yScale: 150 / 512,
        },
      },
    })

    // Create elastic constraint for slingshot effect
    const elastic = Constraint.create({
      pointA: { x: ballX, y: ballY }, // Fixed point at ball's elevated position
      bodyB: ball,
      stiffness: 0.01,
      damping: 0.1,
      length: 0,
      render: {
        visible: true,
        lineWidth: 2,
        strokeStyle: '#666',
      },
    })

    // Create mouse control
    const mouse = Mouse.create(render.canvas)
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false,
        },
      },
    })

    // Track if ball has been shot and ground hits
    let hasShot = false
    let isDragging = false
    let prevPosition = { x: 0, y: 0 }
    const groundedBlocks = new Set<Matter.Body>()

    // Store initial positions of blocks
    const initialPositions = new Map<Matter.Body, number>()
    pyramid.forEach((block) => {
      initialPositions.set(block, block.position.y)
    })

    // Function to get number from block's texture URL

    // Add collision detection
    Events.on(engine, 'afterUpdate', () => {
      if (!hasShot) return

      const groundLevel = window.innerHeight - 120

      pyramid.forEach((block) => {
        const initialY = initialPositions.get(block) || 0
        const hasFallen = block.position.y > initialY + 20

        if (block.position.y > groundLevel && hasFallen && !groundedBlocks.has(block)) {
          groundedBlocks.add(block)

          // Calculate sum using the stored blockNumber
          const sum = Array.from(groundedBlocks).reduce(
            (total, block: Matter.Body & { blockNumber: number }) => {
              return total + block.blockNumber
            },
            0
          )

          setScore(sum)
        }
      })
    })

    // Add mouse event listeners
    Events.on(mouseConstraint, 'mousedown', (event) => {
      if (hasShot) return // Ignore if already shot

      const mousePosition = event.mouse.position
      const distance = Vector.magnitude(Vector.sub(mousePosition, ball.position))

      if (distance < 50) {
        isDragging = true
        prevPosition = { x: ball.position.x, y: ball.position.y }
      }
    })

    Events.on(mouseConstraint, 'mouseup', () => {
      if (isDragging) {
        isDragging = false
        hasShot = true
        setHasShot(true)
        groundedBlocks.clear()
        Composite.remove(engine.world, elastic)
        const velocity = Vector.sub(prevPosition, ball.position)
        Body.setVelocity(ball, {
          x: velocity.x * 0.25,
          y: velocity.y * 0.25,
        })

        // Disable mouse constraint after shot
        Composite.remove(engine.world, mouseConstraint)
      }
    })

    // Add mouse interaction and elastic constraint
    Composite.add(engine.world, [mouseConstraint, elastic])

    // Adjust render options to work with mouse
    render.mouse = mouse

    // Add all bodies to the world
    Composite.add(engine.world, [ground, ...pyramid, ball])

    // Run the engine and renderer
    const runner = Runner.create()
    Engine.run(engine)
    Render.run(render)
    Runner.run(runner, engine)

    // Cleanup on unmount
    return () => {
      Render.stop(render)
      Runner.stop(runner)
      Engine.clear(engine)
      render.canvas.remove()
    }
  }, [])

  return (
    <>
      <div ref={sceneRef} style={{ width: '100vw', height: '100vh' }} />
      <div className='score-modal'>
        {!hasShot ? (
          <>
            <h2>תודה שהבעת עניין באיחול יומולדת שמח לברק ‼</h2>
            <p>
              יש להעיף את הכדור על המטרה כדי לגלות כמה אופרציות עליך להעניק לו במתנה 🙏
            </p>
          </>
        ) : (
          <>
            <h2>וואו, איזו פגיעה, אלופ/ה ‼ 🤩 </h2>
            <div className='score'>{score}</div>
            <h2>אופרציות נספרו! ⚙️</h2>
            <p>
              את האופרציות יש למסור ביד בדה נאנג, ויאטנם 🇻🇳 במידה ואינך מסוגל/ת להגיע לדה
              נאנג בשבוע הקרוב, ניתן להמיר כל אופרציה ל- 10 דולר, ולשלוח בהעברה בנקאית.
            </p>
            <br></br>
            <p>אנא צור/י קשר ע"מ לקבל פרטי חשבון בנק ❤️</p>
          </>
        )}
      </div>
    </>
  )
}

export default App
