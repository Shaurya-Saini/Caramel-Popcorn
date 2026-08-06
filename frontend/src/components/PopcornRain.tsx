import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Matter from 'matter-js'

/**
 * Signature interaction (Content.md §3): clicking anywhere drops a real popcorn
 * body into a Matter.js physics world — it falls under gravity, collides with and
 * bounces off the other popcorn, and piles up. The cursor is an (invisible)
 * physics body, so moving the mouse nudges the pile around. No dragging.
 *
 * Kernels are 2D sprites pre-rendered from the two .glb models
 * (src/assets/popcorn/*.webp), chosen at random so both appear — keeps it cheap
 * (no runtime 3D). Non-persistent: the pile resets on navigation, but the effect
 * keeps working on every page. Scoped entirely to this component.
 */

const spriteUrls = Object.values(
  import.meta.glob('../assets/popcorn/*.webp', { eager: true, query: '?url', import: 'default' })
) as string[]

const { Engine, Runner, Composite, Bodies, Body, Events } = Matter

interface Popcorn {
  body: Matter.Body
  size: number // sprite draw size (px)
  img: number
}

export function PopcornRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const popcornRef = useRef<Popcorn[]>([])
  const location = useLocation()

  // Reset only the pile on navigation (effect keeps running on every page).
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    for (const p of popcornRef.current) Composite.remove(engine.world, p.body)
    popcornRef.current = []
  }, [location.pathname])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const canvas = el // non-null binding for the render closures
    const ctx = canvas.getContext('2d')!
    const isMobile = window.matchMedia('(max-width: 640px)').matches
    const MAX_POPCORN = isMobile ? 60 : 170

    const sprites = spriteUrls.map((url) => {
      const img = new Image()
      img.src = url
      return img
    })

    const engine = Engine.create()
    engine.gravity.y = 1
    engineRef.current = engine

    // Boundaries (recreated on resize).
    let walls: Matter.Body[] = []
    function buildWalls(w: number, h: number) {
      for (const wall of walls) Composite.remove(engine.world, wall)
      const opt = { isStatic: true, restitution: 0.2, friction: 0.6 }
      walls = [
        Bodies.rectangle(w / 2, h + 150, w + 600, 300, opt), // floor
        Bodies.rectangle(-150, h / 2, 300, h * 3, opt), // left
        Bodies.rectangle(w + 150, h / 2, 300, h * 3, opt), // right
      ]
      Composite.add(engine.world, walls)
    }

    // Invisible cursor body — collides with popcorn so the mouse shoves the pile.
    // Larger radius = more clearance around the cursor.
    const mouse = Bodies.circle(-1000, -1000, 42, { isStatic: true })
    Composite.add(engine.world, mouse)

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      buildWalls(canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    function onMouseMove(e: MouseEvent) {
      Body.setPosition(mouse, { x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', onMouseMove)

    function onClick(e: MouseEvent) {
      if (popcornRef.current.length >= MAX_POPCORN) {
        const oldest = popcornRef.current.shift()
        if (oldest) Composite.remove(engine.world, oldest.body)
      }
      const size = (isMobile ? 33 : 45) + Math.random() * 18 // ~1.5x
      const radius = size * 0.42 // physics slightly smaller than sprite → natural overlap
      const body = Bodies.circle(e.clientX, e.clientY, radius, {
        restitution: 0.45, // bounce
        friction: 0.35,
        frictionAir: 0.01,
        density: 0.0016,
      })
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3)
      Composite.add(engine.world, body)
      popcornRef.current.push({ body, size, img: Math.floor(Math.random() * sprites.length) })
    }
    window.addEventListener('click', onClick)

    // Draw after each physics step.
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of popcornRef.current) {
        const img = sprites[p.img]
        ctx.save()
        ctx.translate(p.body.position.x, p.body.position.y)
        ctx.rotate(p.body.angle)
        if (img.complete && img.naturalWidth > 0) {
          const ratio = img.naturalWidth / img.naturalHeight
          const w = ratio >= 1 ? p.size : p.size * ratio
          const h = ratio >= 1 ? p.size / ratio : p.size
          ctx.drawImage(img, -w / 2, -h / 2, w, h)
        } else {
          ctx.fillStyle = '#fdf3cf'
          ctx.beginPath()
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
    }
    Events.on(engine, 'afterUpdate', draw)

    const runner = Runner.create()
    Runner.run(runner, engine)

    return () => {
      Runner.stop(runner)
      Events.off(engine, 'afterUpdate', draw)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
      engineRef.current = null
      popcornRef.current = []
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  )
}
