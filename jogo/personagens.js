// Heróis do jogo. Para trocar pelos seus personagens, edite esta lista:
// nome, descrição, cores, atributos, tipo de ataque e habilidade.
//
// "desenho" (opcional) permite um pixel art próprio: uma lista de linhas em que
// cada letra é uma cor de "cores" e "." é transparente. Sem "desenho", o herói
// usa o boneco padrão com as cores abaixo:
//   h = cabelo, s = pele, e = olhos, r = roupa, d = detalhe, b = botas
window.HEROIS = [
  {
    id: 'guerreiro',
    nome: 'Guerreiro',
    desc: 'Golpes de espada em arco. Aguenta muito dano.',
    cores: { h: '#7a4a21', s: '#f1c27d', e: '#1b1b1b', r: '#b23b3b', d: '#e8c04a', b: '#4a2f1b' },
    vida: 150, ataque: 13, defesa: 5, velocidade: 95,
    golpe: { tipo: 'corte', alcance: 44, arco: 2.0, recarga: 0.36, cor: '#ffffff' },
    habilidade: { nome: 'Giro', tipo: 'giro', recarga: 6, raio: 78, forca: 2.4 },
  },
  {
    id: 'arqueira',
    nome: 'Arqueira',
    desc: 'Flechas rápidas à distância. Frágil, mas ágil.',
    cores: { h: '#e0b040', s: '#f1c27d', e: '#1b1b1b', r: '#2f7d4f', d: '#8b5a2b', b: '#3a2a1a' },
    vida: 105, ataque: 11, defesa: 2, velocidade: 110,
    golpe: { tipo: 'projetil', velocidade: 330, recarga: 0.32, cor: '#f5e6a8', perfura: 0 },
    habilidade: { nome: 'Rajada', tipo: 'rajada', recarga: 5, flechas: 7, forca: 1.3 },
  },
  {
    id: 'mago',
    nome: 'Mago',
    desc: 'Orbes que atravessam inimigos e uma explosão arcana.',
    cores: { h: '#d9d9e8', s: '#e8b98a', e: '#1b1b1b', r: '#4b3fb5', d: '#7fe0ff', b: '#2a2466' },
    vida: 95, ataque: 15, defesa: 1, velocidade: 98,
    golpe: { tipo: 'projetil', velocidade: 210, recarga: 0.55, cor: '#7fe0ff', perfura: 3, tamanho: 5 },
    habilidade: { nome: 'Explosão', tipo: 'explosao', recarga: 7, raio: 85, forca: 2.8 },
  },
];
