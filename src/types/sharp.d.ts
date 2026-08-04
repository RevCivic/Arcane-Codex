declare module 'sharp' {
  type SharpModule = typeof import('sharp')
  const sharp: SharpModule
  export default sharp
}
