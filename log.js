import fs from 'fs'
import util from 'util'
import path from 'path'

// we have to explicitly define __dirname in ESM env
const __dirname = path.resolve()

const root = path.resolve(path.join(__dirname))

const mkdir = util.promisify(fs.mkdir)
const touch = util.promisify(fs.writeFile)
const dirCheck = util.promisify(fs.access)

/**
 * Creates write stream to path
 * @param {String} filePath 
 * @returns {Promise} Promise that represents file stream object
 */
const createWriteStream = filePath => new Promise((resolve, reject) => {
  const stream = fs.createWriteStream(filePath, { flags: 'a' })
  stream.on('error', reject)
  stream.on('ready', () => resolve(stream))
})

/**
 * Creates directory
 * @param {String} dirName Directory name 
 * @returns {Promise} Promise that may contain error
 */
const createDir = async dirName => {
  try {
    await mkdir(dirName)
  }
  catch(e) { return e }
}

/**
 * Checks if directory exists
 * @param {String} dirName Directory name 
 * @returns {Promise} Promise that may contain error
 */
 const doesDirExist = async dirName => {
  try {
    await dirCheck(dirName)
    return true
  }
  catch(e) { return false }
}

/**
 * Creates file
 * @param {String} fileName File name
 * @returns {Promise} Promise that may contain error
 */
const createFile = async fileName => {
  try { 
    await touch(fileName, '')
  }
  catch(e) { return e }
}

/**
 * Creates new logging file and directory if needed
 * @param {String} dirName directory name
 * @param {String} fileName file name
 */
const createLogFile = async (dirName, fileName) => {
  const dirError = await createDir(dirName)
  if(dirError && dirError.code !== 'EEXIST') console.error('ERROR CREATING LOG DIRECTORY:', dirError)
  const fileError = await createFile(path.join(dirName, fileName))
  if(fileError) return console.error('ERROR CREATING LOG FILE', fileError)
  return true
}

let logStreamCache = {
  name: '',
  stream: null
}

/**
 * Retrieves log file stream from cache or creates new log stream and puts into cache
 * @param {String} logFile path to log file
 */
const createLogStream = async logFile => {
  if(logStreamCache.name === logFile) return [null, logStreamCache.stream]
  try {
    const logStream = await createWriteStream(path.resolve(logFile))
    logStreamCache = { name: logFile, stream: logStream }
    return [null, logStream]
  }
  catch(e) {
    return [e]
  }
}

/**
 * Adds leading zero to numbers
 * @param {Number} time - number add leading zero to
 * @example
 * // 02
 * addLeadingZero(2)
 */
const addLeadingZero = time => String(time).length !== 2 ? `0${time}` : String(time)

const parseTemplateLiteralData = data => { 
  for(var i = 0, arr = data[0], bkstrs = data, data = []; i < bkstrs.length; i++) data = [...data, arr[i], bkstrs[i + 1]].filter(i => i !== undefined)
  return data
}

/**
 * typeof logger
 * description logger object with customer id
 */

/**
 * Logging function factory. Robot logs can be found at './logs' directory
 * @param  {String} tag Optional tag
 * @param  {} tag Optional tag
 * @example
 * // normal usage
 * const logger = log(tag)
 * logger('Test')
 * 
 * // tagged usage
 * const logger = log(tag)
 * logger`Something happened ${error}`
 */
const log = async (tag = '', prefix = '') => {
  tag = tag ? `[${tag}]` : ''
  const logDir = path.join(root, 'logs')
/**
 * @param {String} strs must either be list of argumens that are convertable to strings or in case of tagged literal templates way a single template string
 * description: writes logs
 * @example
 * // normal usage
 * logger('Test')
 * 
 * // tagged usage
 * logger`Something happened ${error}`
 * @returns {Void}
 */
  return async (...strs) => {
  
    if(strs[0] && strs[0].map) strs = parseTemplateLiteralData(strs)
    const currentDate = new Date()
    while(tag.length < 11) tag += ' ' // alt+255
    const year = currentDate.getFullYear()
    const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][currentDate.getMonth()]
    const day = currentDate.getDate()
    const logsDirExists = await doesDirExist(logDir)
    if(!logsDirExists) {
      await createDir(logDir)
    }
    const dirName = path.join(root, 'logs', `${year}_${month}`)
    const fileName = prefix ? `${day}_${prefix}` : String(day)
    const filePath = path.join(dirName, fileName)
    console.log(filePath)
    let [ error, logStream ] = await createLogStream(filePath)
    if(error) {
      console.log('error', error, dirName, fileName)
      if(error.code !== 'ENOENT') return console.error('ERROR WRITING TO FILE:', error)
      const success = createLogFile(dirName, fileName)
      if(!success) return
    }

    [ error, logStream ] = await createLogStream(filePath)
    if(error) return console.error('ERROR WRITING TO FILE AGAIN:', error)
    let hours = addLeadingZero(currentDate.getHours())
    let minutes = addLeadingZero(currentDate.getMinutes())
    let seconds = addLeadingZero(currentDate.getSeconds())
    const out = `${hours}:${minutes}:${seconds} ${ tag } ${strs.join(' ')}\n`.replace(/ {2}/g, ' ')
    logStream.write(out, 'utf-8')
    console.log(out) // verbose logging
  }
}

export { log, parseTemplateLiteralData }