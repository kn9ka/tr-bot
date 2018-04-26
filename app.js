import puppeteer from 'puppeteer'
import { config } from './config.js'

const run = async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  await page.goto('https://ts4.travian.ru')

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
  const production = await page.evaluate(() => {
    const table = document.getElementById('production').querySelectorAll('td[class="num"]')
    return {
      wood: table[0].textContent.trim(),
      clay: table[1].textContent.trim(),
      iron: table[2].textContent.trim(),
      crop: table[3].textContent.trim()
    }
  })
  console.log('production: ', production)

  // resources
  const resourceStock = await page.evaluate(() => {
    return {
      wood: document.getElementById('l1').textContent.trim(),
      clay: document.getElementById('l2').textContent.trim(),
      iron: document.getElementById('l3').textContent.trim(),
      crop: document.getElementById('l4').textContent.trim()
    }
  })
  console.log('current stock: ', resourceStock)

  // max stock 
  const maxStock = await page.evaluate(() => {
    const maxResourceStock = document.getElementById('stockBarWarehouse').textContent.trim()
    const maxCropStock = document.getElementById('stockBarGranary').textContent.trim()
    return {
      warehouse: maxResourceStock,
      crop: maxCropStock
    }
  })
  console.log('max stock: ', maxStock)
  /* TODO: 
    получение списка полей с типом, расположением и уровнем
    создание хранилища для стоимости постройки
    создание функций для навигации и нажатия на постройку
    https://github.com/emadehsan/thal
  */
}

run()
