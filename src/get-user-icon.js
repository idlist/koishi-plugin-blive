const API = require('./api')

/**
 * @param {string} module
 * @returns {boolean}
 */
const hasModule = module => {
  try {
    require(module)
    return true
  } catch {
    return false
  }
}

/**
 * @type {'canvas' | 'skia-canvas' | 'sharp' | 'none'}
 */
let imageProcessor = 'none'
if (hasModule('canvas')) imageProcessor = 'canvas'
if (hasModule('skia-canvas')) imageProcessor = 'skia-canvas'
if (hasModule('sharp')) imageProcessor = 'sharp'

const iconSize = 128

/**
 * @param {string} url
 * @returns {Promise<string>} Resized base64 image or https link
 */
const getUserIcon = async (url) => {
  let userIcon

  if (imageProcessor == 'canvas') {
    const { loadImage, createCanvas } = require('canvas')

    const userIconImage = await loadImage(url)
    const canvas = createCanvas(iconSize, iconSize)
    const c = canvas.getContext('2d')
    c.drawImage(userIconImage, 0, 0, iconSize, iconSize)

    userIcon = 'base64://' + canvas.toBuffer('image/png').toString('base64')
  } else if (imageProcessor == 'skia-canvas') {
    const { Canvas, loadImage } = require('skia-canvas')

    const userIconImage = await loadImage(url)
    const canvas = new Canvas(iconSize, iconSize)
    const c = canvas.getContext('2d')
    c.drawImage(userIconImage, 0, 0, iconSize, iconSize)

    userIcon = 'base64://' + canvas.toBufferSync('png').toString('base64')
  } else if (imageProcessor == 'sharp') {
    const sharp = require('sharp')

    const userIconBuffer = await API.getImageBuffer(url)

    userIcon = new sharp(userIconBuffer)
    userIcon.resize({ width: iconSize, height: iconSize })
    userIcon = 'base64://' + userIcon.toBuffer().toString('base64')
  } else {
    userIcon = url
  }

  return userIcon
}

module.exports = getUserIcon