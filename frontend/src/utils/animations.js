import React from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSpring, animated } from 'react-spring';
import { motion } from 'framer-motion';

// Register ScrollTrigger with GSAP
gsap.registerPlugin(ScrollTrigger);

// Reusable Animation Configurations
export const AnimationPresets = {
  // Fade In Animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 }
  },

  // Slide In Animations
  slideIn: {
    left: {
      initial: { x: -100, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      transition: { type: 'spring', stiffness: 120 }
    },
    right: {
      initial: { x: 100, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      transition: { type: 'spring', stiffness: 120 }
    }
  },

  // Scale Animations
  scale: {
    hover: {
      scale: 1.05,
      transition: { duration: 0.3 }
    },
    tap: {
      scale: 0.95
    }
  }
};

// Advanced Scroll-Triggered Animations
export const useScrollAnimations = () => {
  // Animate elements as they enter viewport
  const animateOnScroll = (elementRef) => {
    gsap.fromTo(
      elementRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1, 
        y: 0,
        duration: 1,
        scrollTrigger: {
          trigger: elementRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      }
    );
  };

  // Parallax effect
  const createParallaxEffect = (elementRef, speed = 0.5) => {
    gsap.to(elementRef.current, {
      y: (i, el) => -ScrollTrigger.maxScroll(window) * speed,
      ease: 'none',
      scrollTrigger: {
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    });
  };

  return { animateOnScroll, createParallaxEffect };
};

// 3D Hover Effects
export const use3DCardHover = () => {
  const [props, set] = useSpring(() => ({
    xys: [0, 0, 1],
    config: { mass: 5, tension: 350, friction: 40 }
  }));

  const calc = (x, y) => [
    -(y - window.innerHeight / 2) / 20,
    (x - window.innerWidth / 2) / 20,
    1.1
  ];

  const trans = (x, y, s) => `perspective(600px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`;

  return {
    style: props.xys.interpolate(trans),
    onMouseMove: ({ clientX: x, clientY: y }) => set({ xys: calc(x, y) }),
    onMouseLeave: () => set({ xys: [0, 0, 1] })
  };
};

// Staggered List Animation
export const StaggeredList = ({ children }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, child => (
        <motion.li variants={itemVariants}>
          {child}
        </motion.li>
      ))}
    </motion.ul>
  );
};

// Page Transition Wrapper
export const PageTransition = ({ children }) => {
  const pageVariants = {
    initial: { opacity: 0, x: '-100vw' },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: '100vw' }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
};

export default {
  AnimationPresets,
  useScrollAnimations,
  use3DCardHover,
  StaggeredList,
  PageTransition
};
