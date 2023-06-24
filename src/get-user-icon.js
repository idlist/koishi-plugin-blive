const ApiGenerator = require('./api')

/**
 * @param {string} module
 * @returns {boolean}
 */
const hasModule = (module) => {
  try {
    require(module)
    return true
  } catch {
    return false
  }
}

/** @type {'canvas' | 'skia-canvas' | 'sharp' | 'none'} */
let imageProcessor = 'none'
if (hasModule('canvas')) imageProcessor = 'canvas'
if (hasModule('skia-canvas')) imageProcessor = 'skia-canvas'
if (hasModule('sharp')) imageProcessor = 'sharp'

const iconSize = 128

class UserIconGetter {
  /**
   * @param {import('koishi').Context} ctx
   */
  constructor(ctx) {
    this.ctx = ctx
    this.api = new ApiGenerator(ctx)
  }

  /**
   * @param {string} url
   * @returns {Promise<string>} Resized base64 image or https link
   */
  async get(url) {
    switch (imageProcessor) {
      case 'canvas': {
        const { loadImage, createCanvas } = require('canvas')

        const userIconImage = await loadImage(url)
        const canvas = createCanvas(iconSize, iconSize)
        const c = canvas.getContext('2d')
        c.drawImage(userIconImage, 0, 0, iconSize, iconSize)

        return 'base64://' + canvas.toBuffer('image/png').toString('base64')
      }
      case 'skia-canvas': {
        const { loadImage, Canvas } = require('skia-canvas')

        const userIconImage = await loadImage(url)
        const canvas = new Canvas(iconSize, iconSize)
        const c = canvas.getContext('2d')
        c.drawImage(userIconImage, 0, 0, iconSize, iconSize)

        return 'base64://' + canvas.toBuffer('image/png').toString('base64')
      }
      case 'sharp': {
        const sharp = require('sharp')
        const APIGenerator = require('./api')
        const API = new APIGenerator(this.ctx)

        const userIconBuffer = await API.getImageBuffer(url)

        const userIcon = sharp(userIconBuffer)
        userIcon.resize({ width: iconSize, height: iconSize })
        return 'base64://' + (await userIcon.toBuffer()).toString('base64')
      }
      default:
        return url
    }
  }
}

module.exports = UserIconGetter