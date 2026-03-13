import React from 'react';
import { motion } from 'framer-motion';

export default function Logo({ size = 120 }: { size?: number }) {
  const logoPath = '/logo.png';

  return (
    <motion.div
      // Efeito de entrada lateral (Vindo da esquerda)
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        position: 'relative', // Necessário para o farol se posicionar sobre a imagem
      }}
    >
      <div style={{ width: size, height: size, marginBottom: '5px', position: 'relative' }}>
        <img
          src={logoPath}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.4))',
          }}
          alt="Logo Pediu Chegou Camocim"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://cdn-icons-png.flaticon.com';
          }}
        />

        {/* Efeito de Farol Piscando (Adicionado sobre a imagem) */}
        <motion.div
          animate={{ 
            opacity: [0, 0.8, 0],
            scale: [1, 1.3, 1] 
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            repeatType: "loop" 
          }}
          style={{
            position: 'absolute',
            top: '45%', // Ajuste fino conforme o desenho da sua moto
            right: '15%',
            width: '15px',
            height: '15px',
            backgroundColor: '#F9DC3E',
            borderRadius: '50%',
            filter: 'blur(5px)',
            boxShadow: '0 0 15px #F9DC3E',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div style={{ textAlign: 'center', lineHeight: '0.9' }}>
        <div
          style={{
            fontWeight: '800',
            fontSize: '16px',
            color: '#FFFFFF',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}
        >
          Pediu Chegou
        </div>
        <div
          style={{
            fontWeight: '900',
            fontSize: '52px',
            color: '#F9DC3E',
            letterSpacing: '-2px',
            textTransform: 'uppercase',
            marginTop: '4px',
            fontFamily: 'sans-serif',
          }}
        >
          CAMOCIM
        </div>
      </div>
    </motion.div>
  );
}
