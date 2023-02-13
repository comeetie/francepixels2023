/* global define, XMLHttpRequest */

class BanGeocoder{
  constructor(elmt,options){
    this.options = {placeholder: 'adresse',
      resultsNumber: 7,
      collapsed: true,
      serviceUrl: 'https://api-adresse.data.gouv.fr/search/',
      minIntervalBetweenRequests: 250,
      defaultMarkgeocode: true,
      autofocus: true}
    if(options.placeholder){
        this.options.placeholder=options.placeholder;
    }
    this.elmt = elmt;
  }
  
  add(map) {
      var className = 'control-geocoder-ban'
      var container = this.container = document.createElement('div')
      container.classList.add(className)
      container.classList.add('ban-bar')
      
      var icon = this.icon = document.createElement('button')
      icon.classList.add(className + '-icon')
      icon.innerHTML = '&nbsp;'
      icon.type = 'button'
      container.appendChild(icon);

      var form = this.form = document.createElement('div')
      form.classList.add(className + '-form')
      container.appendChild(form)
      
      var input = this.input = document.createElement('input')
      input.type = 'text'
      input.placeholder = this.options.placeholder
      form.appendChild(input)

      this.elmt.appendChild(container)
  }

  move(direction) {
      var s = document.getElementsByClassName('control-geocoder-ban-selected')
      var el
      if (!s.length) {
        el = this.alts[direction < 0 ? 'firstChild' : 'lastChild']
        el.classList.add(el, 'control-geocoder-ban-selected')
      } else {
        var currentSelection = s[0]
        currentSelection.classList.remove('control-geocoder-ban-selected')
        if (direction > 0) {
          el = currentSelection.previousElementSibling ? currentSelection.previousElementSibling : this.alts['lastChild']
        } else {
          el = currentSelection.nextElementSibling ? currentSelection.nextElementSibling : this.alts['firstChild']
        }
      }
      if (el) {
        el.classList.add('control-geocoder-ban-selected')
      }
  }
keyup(e) {
      switch (e.keyCode) {
        case 27:
          // escape
          this.minimizeControl()
          break
        case 38:
          // down
          this.move(1)
          break
        case 40:
          // up
          this.move(-1)
          break
        case 13:
          // enter
          var s = document.getElementsByClassName('control-geocoder-ban-selected')
          if (s.length) {
            this.geocodeResult(s[0].geocodedFeatures)
          }
          break
        default:
          if (this.input.value) {
            var params = {q: this.input.value, limit: this.options.resultsNumber}
            var t = this
            if (this.setTimeout) {
              clearTimeout(this.setTimeout)
            }
            // avoid responses collision if typing quickly
            this.setTimeout = setTimeout(function () {
              getJSON(t.options.serviceUrl, params, t.displayResults(t))
            }, this.options.minIntervalBetweenRequests)
          } else {
            this.clearResults()
          }
      }
    }

  clearResults() {
    while (this.alts.firstChild) {
      this.alts.removeChild(this.alts.firstChild)
    }
  }
  
  getJSON = function (url, params, callback) {
    var xmlHttp = new XMLHttpRequest()
    xmlHttp.onreadystatechange = function () {
      if (xmlHttp.readyState !== 4) {
        return
      }
      if (xmlHttp.status !== 200 && xmlHttp.status !== 304) {
        return
      }
      callback(JSON.parse(xmlHttp.response))
    }
    xmlHttp.open('GET', url + L.Util.getParamString(params), true)
    xmlHttp.setRequestHeader('Accept', 'application/json')
    xmlHttp.send(null)
  }

  displayResults(t) {
      t.clearResults()
      return function (res) {
        if (res && res.features) {
          var features = res.features
          t.alts.classList.remove('control-geocoder-ban-alternatives-minimized')
          for (var i = 0; i < Math.min(features.length, t.options.resultsNumber); i++) {
            t.alts.appendChild(t.createAlt(features[i], i))
          }
        }
      }
  }

  createAlt(feature, index) {
      var li = L.DomUtil.create('li', '')
      var a = L.DomUtil.create('a', '', li)
      li.setAttribute('data-result-index', index)
      a.innerHTML = '<strong>' + feature.properties.label + '</strong>, ' + feature.properties.context
      li.geocodedFeatures = feature
      var clickHandler = function (e) {
        this.minimizeControl()
        this.geocodeResult(feature)
      }
      var mouseOverHandler = function (e) {
        var s = document.getElementsByClassName('leaflet-control-geocoder-ban-selected')
        if (s.length) {
          L.DomUtil.removeClass(s[0], 'leaflet-control-geocoder-ban-selected')
        }
        L.DomUtil.addClass(li, 'leaflet-control-geocoder-ban-selected')
      }
      var mouseOutHandler = function (e) {
        L.DomUtil.removeClass(li, 'leaflet-control-geocoder-ban-selected')
      }
      L.DomEvent.on(li, 'click', clickHandler, this)
      L.DomEvent.on(li, 'mouseover', mouseOverHandler, this)
      L.DomEvent.on(li, 'mouseout', mouseOutHandler, this)
      return li
    },
}

