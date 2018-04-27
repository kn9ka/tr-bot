import puppeteer from 'puppeteer'
import { config } from './config.js'
import jsonfile from 'jsonfile'
import fs from 'fs'

let debug = true
const server = config.serverUrl
const run = async () => {

  // create folders 
  const accountFolder = `./storage/${config.login}`
  if (!fs.existsSync(accountFolder)) {
    fs.mkdirSync('./storage')
    fs.mkdirSync(accountFolder)
  }

  // init browser
  const browser = await puppeteer.launch({ headless: !debug })
  const page = await browser.newPage()
  const jsonCallback = (e) => !e ? null : console.log('\x1b[31msomething goes wrong: ', e) // callback for json write and read

  await page.goto(server)

  // login
  const LOGIN_SELECTOR = 'td input[name="name"]'
  const PASSWORD_SELECTOR = 'td input[name="password"]'
  const LOGIN_BUTTON_SELECTOR = 'button#s1.green'

  await page.click(LOGIN_SELECTOR)
  await page.keyboard.type(config.login)

  await page.click(PASSWORD_SELECTOR)
  await page.keyboard.type(config.password)

  await page.click(LOGIN_BUTTON_SELECTOR)
  await page.waitForNavigation({ waitUntil: 'networkidle2' })

  // production 
  const productionRate = await page.evaluate(() => {
    const table = document.getElementById('production').querySelectorAll('td[class="num"]')
    return {
      wood: table[0].textContent.trim(),
      clay: table[1].textContent.trim(),
      iron: table[2].textContent.trim(),
      crop: table[3].textContent.trim()
    }
  })
  jsonfile.writeFile(`${accountFolder}/production-rate.json`, productionRate, jsonCallback)

  // resources
  const resourceStock = await page.evaluate(() => {
    return {
      wood: document.getElementById('l1').textContent.trim(),
      clay: document.getElementById('l2').textContent.trim(),
      iron: document.getElementById('l3').textContent.trim(),
      crop: document.getElementById('l4').textContent.trim()
    }
  })
  jsonfile.writeFile(`${accountFolder}/resource-stock.json`, resourceStock, jsonCallback)

  // max stock 
  const maxStock = await page.evaluate(() => {
    const maxResourceStock = document.getElementById('stockBarWarehouse').textContent.trim()
    const maxCropStock = document.getElementById('stockBarGranary').textContent.trim()
    const freeCropStock = document.getElementById('stockBarFreeCrop').textContent.trim()
    return {
      warehouse: maxResourceStock,
      crop: maxCropStock,
      freeCrop: freeCropStock
    }
  })
  jsonfile.writeFile(`${accountFolder}/max-stock.json`, maxStock, jsonCallback)

  // building
  // другая реализация let buildings = await page.$$('div.level')
  const resourceFields = await page.evaluate(() => {
    const b = []
    const types = { gid1: 'wood', gid2: 'clay', gid3: 'iron', gid4: 'crop' }
    const buildings = document.querySelectorAll('div.level')
    for (let field in buildings) {
      if (!!buildings[field].className) {
        let fieldInfo = buildings[field].className.split(' ')
        // TODO: переписать на отдельную функцию с поиском индекса, т.к. сейчас на 3 индексе может быть флаг постройки
        b.push({
          id: Number(field) + 1,
          underConstruction: false,
          type: types[fieldInfo[3]],
          level: fieldInfo[4].replace('level', '')
        })
      }
    }
    return b
  })
  jsonfile.writeFile(`${accountFolder}/resource-fields.json`, resourceFields, jsonCallback)

  // get build costs for resource fields
  let resourceFieldsBuildingCosts = []
  for (let field in resourceFields) {
    let id = resourceFields[field].id
    await page.goto(`${server}/build.php?id=${id}`)
    await page.waitForSelector('span.resources.r4') // wait until the last html tag of build costs is not loaded 
    let buildingCost = await page.evaluate(() => {
      let wood = document.querySelector('span.resources.r1').textContent.trim()
      let clay = document.querySelector('span.resources.r2').textContent.trim()
      let iron = document.querySelector('span.resources.r3').textContent.trim()
      let crop = document.querySelector('span.resources.r4').textContent.trim()
      return { wood, clay, iron, crop }
    })
    resourceFieldsBuildingCosts.push({ id: id, ...buildingCost })
  }
  jsonfile.writeFile(`${accountFolder}/build-cost.json`, resourceFieldsBuildingCosts, jsonCallback)

  /* TODO: 
    функцию постройки (не забыть про uuid который вешается на клик по кнопке строить, его нужно подставлять в юрл, если этого не происходит)
    чтение квестов -  скриптинг для квестов по оптимальному развитию
    начать разбирать героя, прокачку и отправку на приключения
    https://github.com/emadehsan/thal
  */

}

run()
