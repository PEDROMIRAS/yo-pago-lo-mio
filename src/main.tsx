import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, MotionConfig, domMax } from 'motion/react'
import { IconContext } from '@phosphor-icons/react'
import './styles.css'
import App from './App.tsx'
import { spring } from './motion'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* domMax: layout, layoutId y drag. Síncrono a propósito: cargado aparte, las listas que se
        montan antes de que llegue se quedan en su estado inicial (invisibles). */}
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={spring}>
        <IconContext.Provider value={{ size: 20, weight: 'regular' }}>
          <App />
        </IconContext.Provider>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
)
