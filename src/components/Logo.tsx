import React from 'react';
import { motion } from 'framer-motion';

export default function Logo({ size = 320 }: { size?: number }) { 
  const logoPath = '/logo.png';
  
  // Proporções calculadas para os textos crescerem junto com a logo
  const fontSizeTop = size * 0.12; 
  const fontSizeMain = size * 0.35; 

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '15px',
        marginTop: '60px', // Desce o componente na página
        width: '100%',
        overflow: 'visible', // Garante que a logo maior não seja cortada
      }}
    >
      {/* 1. Container da Imagem com tamanho REALMENTE grande */}
      <motion.div
        initial={{ x: -150, opacity: 0 }}
        animate={{ 
          x: 0, 
          opacity: 1,
          y: [0, -2, 0, -1, 0] 
        }}
        transition={{ 
          x: { type: "spring", stiffness: 100, damping: 15 },
          y: { repeat: Infinity, duration: 0.3, ease: "linear" } 
        }}
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          minWidth: `${size}px`, // Força o navegador a aceitar o tamanho
          minHeight: `${size}px`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src={logoPath}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.5))',
          }}
          alt="Logo Pediu Chegou"
        />

        {/* 2. Farol com brilho restaurado e proporcional */}
        <motion.div
          animate={{ 
            opacity: [0, 1, 0.4, 1, 0],
            scale: [1, 1.5, 1.2, 1.5, 1] 
          }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: '45%', 
            right: '15%',
            width: `${size * 0.12}px`, // Luz proporcional ao tamanho da moto
            height: `${size * 0.12}px`,
            backgroundColor: '#F9DC3E',
            borderRadius: '50%',
            filter: 'blur(10px)',
            boxShadow: '0 0 35px #F9DC3E, 0 0 60px #F9DC3E',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      </motion.div>

      {/* 3. Textos (Crescendo proporcionalmente) */}
      <div style={{ textAlign: 'center', lineHeight: '0.8', width: '100%' }}>
        <div
          style={{
            fontWeight: '800',
            fontSize: `${fontSizeTop}px`,
            color: '#FFFFFF',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}
        >
          Pediu Chegou
        </div>
        <div
          style={{
            fontWeight: '900',
            fontSize: `${fontSizeMain}px`, 
            color: '#F9DC3E',
            letterSpacing: '-3px',
            textTransform: 'uppercase',
            marginTop: '10px',
            fontFamily: 'sans-serif',
          }}
        >
          CAMOCIM
        </div>
      </div>
    </div>
  );
}
