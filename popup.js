/* eslint-disable camelcase */
/* eslint-disable no-undef */

// Execute inject.js
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0]
  const currentTabUrl = new URL(currentTab.url)

  // Error handling code
  if (currentTabUrl.protocol === 'chrome:') {
    console.log('Sorry, this extension is not available on this page.')
  } else {
    chrome.scripting.executeScript({
      target: {
        tabId: tabs[0].id
      },
      files: ['inject.js']
    })
  }
})

// Function to evaluate dropdown field name and show/hide corresponding inputs
function fieldCheck (event) {
  let className
  switch (event) {
    case 'purchase':
    case 'refund':
      className = 'purchase'
      break
    case 'add_payment_info':
      className = 'payment_type'
      break
    case 'add_shipping_info':
      className = 'shipping_tier'
      break
    case 'view_promotion':
    case 'select_promotion':
      className = 'promotion'
      break
  }

  document.querySelectorAll('.optionalField').forEach(function (input) {
    if (input.classList.contains(className)) {
      input.style.display = 'flex'
    } else {
      input.style.display = 'none'
    }
  })
}

// Set initial fields based on drop down choice
const dropdown = document.querySelector('.dropdown')

fieldCheck(dropdown.value)

// Restore dropdown choice and input field options on popup open

chrome.storage.sync.get(dropdown.name, result => {
  const newdropdown = (result[dropdown.name])
  if (result.selectChoices) {
    dropdown.value = newdropdown
    fieldCheck(newdropdown)
  }
})

// Event listener for changes to the drop-down value
// Changes viewable fields and saves dropdown value
dropdown.addEventListener('change', function () {
  fieldCheck(this.value)
  const field = this.name
  const value = this.value
  chrome.storage.sync.set({
    [field]: value
  })
})

// Helper function to round numbers to 2 decimal places for financial values
function round (num) {
  return parseFloat(Math.round(num * 100) / 100)
}

// Generate fake Item ID
function generateItemId (str) {
  const charCodes = str
    .split('')
    .filter(char => char !== ' ')
    .map(char => char.charCodeAt(0))
    .join('')

  if (charCodes.length <= 6) {
    return parseInt(charCodes)
  } else if (charCodes.length > 6) {
    return parseInt(charCodes.slice(0, 3).concat(charCodes.slice(-3)))
  } else {
    return ''
  }
}

// Auto generate fake item ID
document.querySelector('#item_name').addEventListener('keyup', function () {
  const item_id = generateItemId(document.querySelector('#item_name').value)
  if (!isNaN(item_id)) {
    document.querySelector('#item_id').value = item_id
  } else {
    document.querySelector('#item_id').value = ''
  }
})

// Control Accordion functionality
const accordion = document.querySelector('.accordion')

accordion.addEventListener('click', function () {
  /* Toggle between adding and removing the "active" class,
    to highlight the button that controls the panel */
  this.classList.toggle('active')

  /* Toggle between hiding and showing the active panel */
  const panel = this.nextElementSibling
  if (panel.style.display === 'block') {
    panel.style.display = 'none'
  } else {
    panel.style.display = 'block'
  }
})

// Timestamp for CSV
function timestamp () {
  const date = new Date()
  const timestamp = date.getFullYear() + '-' +
    ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
    ('0' + date.getDate()).slice(-2) + ' ' +
    ('0' + date.getHours()).slice(-2) + ':' +
    ('0' + date.getMinutes()).slice(-2) + ':' +
    ('0' + date.getSeconds()).slice(-2) + '.' +
    ('00' + date.getMilliseconds()).slice(-3)
  return timestamp
}

// Define ecommerce CSV headers

const headers = ['timestamp', 'event', 'item_name', 'item_id', 'price', 'transaction_id', 'quantity', 'discount', 'currency', 'tax', 'shipping', 'payment_type', 'shipping_tier', 'coupon', 'item_brand', 'item_category', 'item_list_id', 'item_list_name', 'item_variant', 'location_id', 'creative_name', 'creative_slot', 'promotion_name', 'promotion_id']
let custom_headers = ['timestamp', 'event']

let csvValues = []
let custom_csvValues = []

// Load saved CSV data if present
chrome.storage.sync.get('csv_data', function (result) {
  if (result.csv_data) {
    csvValues = result.csv_data
  }
})
chrome.storage.sync.get(['custom_csv_data', 'custom_headers'], function (result) {
  if (result.custom_csv_data) {
    custom_csvValues = result.custom_csv_data
  }
  if (result.custom_headers) {
    custom_headers = result.custom_headers
  }
})

// Send form data to inject.js
document.getElementById('button').addEventListener('click', () => {
  chrome.storage.sync.get('openTab', function (result) {
    if (result.openTab === 2) {
      const tab2Fields = document.querySelectorAll('#dynamicForm input')
      const cEventName = document.getElementById('cEventName').value
      const cEventArray = {}

      for (let i = 0; i < tab2Fields.length; i += 2) {
        const keyname = tab2Fields[i].value
        let value = tab2Fields[i + 1].value
        // Converts numbers into numbers rather than strings
        if (!isNaN(value)) {
          value = Number(value)
        }
        cEventArray[keyname] = value

        // Adds new headers to custom_headers array
        if (!custom_headers.includes(keyname)) {
          if (keyname !== '') {
            custom_headers.push(keyname)
            chrome.storage.sync.set({
              custom_headers
            })
          }
        }
      }

      // Blank CSV row
      const custom_csvRow = {}
      custom_csvRow.timestamp = timestamp()
      custom_csvRow.event = cEventName

      // Push parameters to row object
      document.querySelectorAll('[id^="parameter"]').forEach(parameter => {
        const i = parameter.id.replace('parameter', '')
        const value = document.querySelector(`#value${i}`)
        if (custom_headers.includes(parameter.value)) {
          custom_csvRow[parameter.value] = value.value
        }
      })

      // Push row to custom csvRow object
      custom_csvValues.push(custom_csvRow)

      chrome.storage.sync.set({
        custom_csv_data: custom_csvValues
      })

      data = {
        event: cEventName,
        [cEventName]: cEventArray
      }

      chrome.tabs.query({
        active: true,
        currentWindow: true
      }, (tabs) => {
        const currentTab = tabs[0]
        const currentTabUrl = new URL(currentTab.url)
        if (currentTabUrl.protocol === 'chrome:') {
          console.log('Plugin does not work in the Chrome Store')
          messageShow('Cannot submit on this page')
        } else {
          chrome.tabs.sendMessage(tabs[0].id, data)
        }
      })

      return
    } else if (result.openTab === 1 || result.openTab === undefined) {
      const event = document.querySelector('#pushSelect select[name="selectChoices"]').value
      const item_name = document.getElementById('item_name').value
      const transaction_id = 'dLP' + String(Date.now())
      const item_id = document.getElementById('item_id').value
      const price = round(document.getElementById('price').value)
      const quantity = round(document.getElementById('quantity').value)
      let discount
      const currency = document.getElementById('currency').value
      const tax = round(document.getElementById('tax').value)
      const shipping = round(document.getElementById('shipping').value)
      const payment_type = document.getElementById('payment_type').value
      const shipping_tier = document.getElementById('shipping_tier').value
      let coupon
      let item_brand
      let item_category
      let item_list_id
      let item_list_name
      let item_variant
      let location_id
      const creative_name = document.getElementById('creative_name').value
      const creative_slot = document.getElementById('creative_slot').value
      const promotion_name = document.getElementById('promotion_name').value
      const promotion_id = document.getElementById('promotion_id').value

      if (checkbox.checked === true) {
        discount = round(document.getElementById('discount').value)
        coupon = document.getElementById('coupon').value
        item_brand = document.getElementById('item_brand').value
        item_category = document.getElementById('item_category').value
        item_list_id = document.getElementById('item_list_id').value
        item_list_name = document.getElementById('item_list_name').value
        item_variant = document.getElementById('item_variant').value
        location_id = document.getElementById('location_id').value
      }

      const items = [{
        ...(item_id !== undefined ? { item_id } : {}),
        item_name,
        price,
        ...(discount !== '' ? { discount } : {}),
        quantity,
        ...(coupon !== undefined ? { coupon } : {}),
        ...(item_brand !== undefined ? { item_brand } : {}),
        ...(item_category !== undefined ? { item_category } : {}),
        ...(item_list_id !== undefined ? { item_list_id } : {}),
        ...(item_list_name !== undefined ? { item_list_name } : {}),
        ...(item_variant !== undefined ? { item_variant } : {}),
        ...(location_id !== undefined ? { location_id } : {})
      }]

      if (['purchase', 'refund'].includes(event)) {
        data = {
          event,
          ecommerce: {
            transaction_id,
            value: (price - (discount || 0)) * quantity,
            tax,
            shipping,
            currency,
            items
          }
        }
      } else if (['select_item', 'view_item_list'].includes(event)) {
        data = {
          event,
          ecommerce: {
            ...(item_list_id !== undefined
              ? {
                  item_list_id
                }
              : {}),
            ...(item_list_name !== undefined
              ? {
                  item_list_name
                }
              : {}),
            items
          }
        }
      } else if (['view_item', 'add_to_cart', 'add_to_wishlist', 'view_cart', 'remove_from_cart'].includes(event)) {
        data = {
          event,
          ecommerce: {
            currency,
            value: (price - (discount || 0)) * quantity,
            items
          }
        }
      } else if (event === 'begin_checkout') {
        data = {
          event,
          ecommerce: {
            currency,
            value: (price - (discount || 0)) * quantity,
            coupon,
            items
          }
        }
      } else if (event === 'add_shipping_info') {
        data = {
          event,
          ecommerce: {
            currency,
            value: (price - (discount || 0)) * quantity,
            coupon,
            ...(shipping_tier !== undefined ? { shipping_tier } : {}),
            items
          }
        }
      } else if (event === 'add_payment_info') {
        data = {
          event,
          ecommerce: {
            ...(payment_type !== undefined ? { payment_type } : {}),
            items
          }
        }
      } else if (['view_promotion', 'select_promotion'].includes(event)) {
        data = {
          event,
          ecommerce: {
            ...(creative_name !== undefined
              ? {
                  creative_name
                }
              : {}),
            ...(creative_slot !== undefined
              ? {
                  creative_slot
                }
              : {}),
            ...(promotion_name !== undefined
              ? {
                  promotion_name
                }
              : {}),
            ...(promotion_id !== undefined
              ? {
                  promotion_id
                }
              : {}),
            items
          }
        }
      }

      chrome.tabs.query({
        active: true,
        currentWindow: true
      }, (tabs) => {
        const currentTab = tabs[0]
        const currentTabUrl = new URL(currentTab.url)
        if (currentTabUrl.protocol === 'chrome:') {
          console.log('Plugin does not work in the Chrome Store')
          messageShow('Cannot submit on this page')
        } else {
          chrome.tabs.sendMessage(tabs[0].id, data)
        }
      })

      // Handle CSV generation

      const newHeaders = headers.filter(header => header !== 'event' && header !== 'timestamp' && header !== 'transaction_id')
      const csvRow = {}

      csvRow.timestamp = timestamp()
      csvRow.event = event
      if (['purchase', 'refund'].includes(event)) {
        csvRow.transaction_id = transaction_id
      } else {
        csvRow.transaction_id = ''
      }

      newHeaders.forEach(id => {
        const element = document.getElementById(id)
        console.log(id)

        if (element && element.offsetParent === null) {
          csvRow[id] = ''
        } else {
          csvRow[id] = element.value
        }
      })

      // Push csv values to row
      csvValues.push(csvRow)

      chrome.storage.sync.set({
        csv_data: csvValues
      })
    };
  })
})

// DateTime value function
function dateTime () {
  return `${
        new Date().getFullYear()
      }${
        ('0' + (new Date().getMonth() + 1)).slice(-2)
      }${
        ('0' + new Date().getDate()).slice(-2)
      }_${
        ('0' + new Date().getHours()).slice(-2)
      }${
        ('0' + new Date().getMinutes()).slice(-2)
      }`
}

// CSV download button
document.getElementById('csvDownload').addEventListener('click', function () {
  let csv = ''
  headers.forEach(function (header) {
    csv += header + ','
  })
  csv = csv.slice(0, -1) + '\n'
  csvValues.forEach(function (row) {
    headers.forEach(function (header) {
      csv += row[header] + ','
    })
    csv = csv.slice(0, -1) + '\n'
  })

  // Encode the CSV string as a data URI
  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv)

  // Download the CSV file
  const filename = 'dLPusher' + dateTime() + '.csv'
  chrome.downloads.download({ url: encodedUri, filename })
})

// Custom CSV download button
document.getElementById('custom_csvDownload').addEventListener('click', function () {
  let csv = ''
  custom_headers.forEach(function (header) {
    csv += header + ','
  })
  csv = csv.slice(0, -1) + '\n'
  custom_csvValues.forEach(function (row) {
    custom_headers.forEach(function (header) {
      csv += row[header] + ','
    })
    csv = csv.slice(0, -1) + '\n'
  })

  // Encode the CSV string as a data URI
  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv)

  // Download the CSV file
  const filename = 'dLPusher' + dateTime() + '.csv'
  chrome.downloads.download({ url: encodedUri, filename })
})

// Messages

// Clear CSV
document.getElementById('csvReset').addEventListener('click', function () {
  csvValues = []
  chrome.storage.sync.set({
    csv_data: csvValues
  })
  messageShow('Custom pushes CSV cleared')
})

// Show message on button click
function messageShow (text) {
  const message = document.querySelector('.messages')
  message.textContent = text
  message.style.opacity = '1'

  setTimeout(function () {
    message.style.opacity = '0'
  }, 2000)
}

// Clear Custom CSV
document.getElementById('custom_csvReset').addEventListener('click', function () {
  custom_csvValues = []
  chrome.storage.sync.set({
    custom_csv_data: custom_csvValues
  })
  custom_headers = ['timestamp', 'event']
  chrome.storage.sync.set({
    custom_headers
  })
  messageShow('CSV cleared')
})

// Additional fields functionality

// Get the checkbox element
const checkbox = document.querySelector('#advancedFields')
const text = document.querySelector('.text-target')

// Behaviour depending on additionalFields status
function additionalFieldCheck (input) {
  const hidden = document.querySelectorAll('.hidden')
  if (input === true) {
    text.style.color = '#1a147d'
    text.style.fontWeight = 'bold'
    chrome.storage.sync.set({
      additionalFields: true
    })
    hidden.forEach(element => {
      element.style.display = 'flex'
    })
  } else if (input === false) {
    text.style.color = '#979999'
    text.style.fontWeight = 'normal'
    chrome.storage.sync.set({
      additionalFields: false
    })
    hidden.forEach(element => {
      element.style.display = 'none'
    })
  }
}

// Open additional fields based on chrome storage state
chrome.storage.sync.get('additionalFields', function (result) {
  if (result.additionalFields === true) {
    document.querySelector('#advancedFields').checked = true
    additionalFieldCheck(true)
  }
})

// Add an event listener to the checkbox
checkbox.addEventListener('change', function () {
  additionalFieldCheck(checkbox.checked)
})

// Tab Functionality
// get the tab buttons and tab content
const button1 = document.querySelector('#button1')
const button2 = document.querySelector('#button2')
const tab1 = document.querySelector('#tab1')
const tab2 = document.querySelector('#tab2')
const csvButtons = document.querySelector('.csvButtons')
const customCsvButtons = document.querySelector('.custom_csvButtons')

// hide tab2 initially

chrome.storage.sync.get('openTab', function (result) {
  if (result.openTab === 1 || result.openTab === undefined) {
    tab2.style.display = 'none'
    button1.classList.add('active')
    customCsvButtons.style.display = 'none'
  } else if (result.openTab === 2) {
    tab1.style.display = 'none'
    csvButtons.style.display = 'none'
    tab2.style.display = 'block'
    button2.classList.add('active')
  }
})

// add event listeners to the tab buttons
button1.addEventListener('click', () => {
  // show tab1 and hide tab2
  tab1.style.display = 'block'
  tab2.style.display = 'none'
  csvButtons.style.display = 'flex'
  customCsvButtons.style.display = 'none'
  chrome.storage.sync.set({
    openTab: 1
  })
  button1.classList.add('active')
  button2.classList.remove('active')
})

button2.addEventListener('click', () => {
  // show tab2 and hide tab1
  tab1.style.display = 'none'
  tab2.style.display = 'block'
  csvButtons.style.display = 'none'
  customCsvButtons.style.display = 'flex'
  chrome.storage.sync.set({
    openTab: 2
  })
  button2.classList.add('active')
  button1.classList.remove('active')
})

// Listener to remove fields with minus button click
function removeButton () {
  const target = document.getElementById('event' + this.id)
  const targets = document.querySelectorAll('#event' + this.id + ' input')

  targets.forEach(function (input) {
    chrome.storage.sync.remove(input.name)
  })

  target.remove()
  chrome.storage.sync.set({
    visibleFields: dynamicForm.innerHTML
  })
  if (document.querySelectorAll('#dynamicForm input').length === 0) {
    epCount = 1
    chrome.storage.sync.set({
      epCount
    })
  }
}

// Dynamically add form fields

const dynamicForm = document.getElementById('dynamicForm')
// Counter for parameter numbers

let epCount = 1
chrome.storage.sync.get('epCount', function (result) {
  if (result.epCount) {
    epCount = result.epCount
  }
})

chrome.storage.sync.get('visibleFields', function (result) {
  if (result.visibleFields) {
    dynamicForm.innerHTML = result.visibleFields
    document.querySelectorAll('.minus').forEach(function (input) {
      input.addEventListener('click', removeButton)
    })
    document.querySelectorAll('#dynamicForm input').forEach(input => {
      input.addEventListener('change', event => {
        const field = event.target.name
        const value = event.target.value
        chrome.storage.sync.set({
          [field]: value
        })
      })
    })
  }
})

// Function to add new form fields
function addField () {
  const div = document.createElement('div')
  div.setAttribute('class', 'row')
  div.setAttribute('id', 'eventParam' + epCount)
  div.innerHTML = '<div class="form-group"><label for="parameter' + epCount + '">Name</label><input class="form-input" type="text" id="parameter' + epCount + '" name="parameter' + epCount + '"></div><div class="form-group"><label for="value' + epCount + '">Value</label><input class="form-input" type="text" id="value' + epCount + '" name="value' + epCount + '"></div><button id="Param' + epCount + '" class="minus"><span>-</span></button>'
  dynamicForm.appendChild(div)
  document.querySelector('#Param' + epCount).addEventListener('click', removeButton)

  const addedFields = document.querySelectorAll('#eventParam' + epCount + ' input')
  addedFields.forEach(input => {
    input.addEventListener('change', event => {
      const field = event.target.name
      const value = event.target.value
      chrome.storage.sync.set({
        [field]: value
      })
    })
  })

  epCount++
  chrome.storage.sync.set({
    epCount
  })
}

// Listener on add event parameter button
const addButton = document.getElementById('addEP')
addButton.addEventListener('click', function () {
  addField()
  chrome.storage.sync.set({
    visibleFields: dynamicForm.innerHTML
  })
})

// Save the value of the input field when the changed
const inputs = document.querySelectorAll('.form-input')

inputs.forEach(input => {
  input.addEventListener('change', event => {
    const field = event.target.name
    const value = event.target.value
    chrome.storage.sync.set({
      [field]: value
    })
  })
})

// Restore the value of the input field when the popup is reopened
window.addEventListener('load', function () {
  document.querySelectorAll('.form-input').forEach(input => {
    chrome.storage.sync.get(input.name, result => {
      if (result[input.name] !== undefined) {
        input.value = result[input.name]
      }
    })
  })
})
