// clear ui
document.getElementById("file").value = ""

var map = new maplibregl.Map({
    container: 'map',
    style: 'omap_2023.json',
    //center: [55.3872228,-21.1349647],
    center:[-61.1538584,14.6343799],
    minZoom: 2,
    maxZoom:18,
    zoom: 9,
    hash:true
});

var scale = new maplibregl.ScaleControl({
    maxWidth: 80,
    unit: 'metric'
});
map.addControl(scale);

var hoveredId = null;

var nav = new maplibregl.NavigationControl();
map.addControl(nav, 'top-right');




var roadsLayers      = ["tunnel_motorway_casing","tunnel_motorway_inner", "aeroway-taxiway", "aeroway-runway-casing",  "aeroway-runway", "highway_minor", "highway_major_casing", "highway_major_inner","highway_motorway_casing", "highway_motorway_inner", "railway_transit", "railway_transit_dashline", "railway_service", "railway_service_dashline", "railway", "railway_dashline","highway_motorway_bridge_casing", "highway_motorway_bridge_inner",  "highway_name_other", "highway_name_motorway"]
var labelsLayers     = ["place_state","place_village","place_town","place_city","place_capital","place_city_large"]
var boundariesLayers = ["boundary_fr_dep","boundary_fr_com","boundary_fr"]
var landcoverLayers = ["park","landcover_glacier","landcover_wood","landcover_wood-copy"]




function extract_value(l,properties){
	let v = 0;
	switch(l.year){
		case "evol":
			switch(l.denom){
				case "log":
				v=properties[`${l.denom}_${l.name}_2017`]/properties[`men_2017`]-properties[`${l.denom}_${l.name}_2015`]/properties[`men_2015`]
				break;
				case "area":
				v=(properties[`ind_2017`]/properties['area']*1000000)-(properties[`ind_2015`]/properties['area']*1000000)
				break;
				default:
				v=properties[`${l.denom}_${l.name}_2017`]/properties[`${l.denom}_2017`]-properties[`${l.denom}_${l.name}_2015`]/properties[`${l.denom}_2015`]
			}
		break;
		default:
			switch(l.denom){
				case "log":
				v=properties[`${l.denom}_${l.name}_${l.year}`]/properties[`men_${l.year}`]
				break;
				case "area":
				v=properties[`ind_${l.year}`]/properties['area']*1000000
				break;
				default:
				v=properties[`${l.denom}_${l.name}_${l.year}`]/properties[`${l.denom}_${l.year}`]
			}
	}
	return v;
}


  



promises = [d3.csv('./assets/data/datasample1000.csv')]
Promise.all(promises).then(function(values){
  let datasample1000=values[0]
  

  // generation des quantiles pour les echelles de couleurs
  quantiles_ratio = function(numerator,denominator,year){
  // même échelle pour tous les millésime a partir des données de 2015
  year=2015
  let q=[]
  switch(denominator){
    case "area":
      numerator=numerator.split("_")[1];
      q = [0.000,0.125,0.250,0.375,0.500,0.625,0.750,0.875,1.000]
        .map(q => d3.quantile(datasample1000,q, r=> r[`${numerator}_${year}`]/(200*200)*1000000))
      break;
    case "log":
      let vals =  datasample1000.map(r=> r[`${numerator}_${year}`]/r[`men_${year}`]).filter(v=>v!=0 && v!=1)
      q = [0.000,0.125,0.250,0.375,0.500,0.625,0.750,0.875,1.000].map(q => d3.quantile(vals,q));
      break;
    default:
      let cvals =  datasample1000.map(r=> r[`${numerator}_${year}`]/r[`${denominator}_${year}`]).filter(v=>v!=0 && v!=1)
      q = [0.000,0.125,0.250,0.375,0.500,0.625,0.750,0.875,1.000].map(q => d3.quantile(cvals,q))
    }
    return q.map((qv,iq)=>iq>0 && q[iq-1]==q[iq] ? q[iq]+0.00001 : q[iq]);
  }

  mylayers.forEach(l => l.steps=quantiles_ratio(`${l.denom}_${l.name}`,`${l.denom}`,l.year))

  // generation des quantiles pour les echelles de couleurs variables d'evolutions
  quantiles_ratio_evol = function(numerator,denominator){
     let q = [];
     switch(denominator){
       default:
       	let vals = datasample1000.map(r => r[`${numerator}_2017`]/r[`${denominator}_2017`]-r[`${numerator}_2015`]/r[`${denominator}_2015`])
     	  let qleft = [0,0.25,0.5,0.75].map(q => d3.quantile(vals.filter(v=>v<0),q))
     	  let qright = [0.25,0.5,0.75,1].map(q => d3.quantile(vals.filter(v=>v>0),q))
     	  q = qleft.concat([0]).concat(qright)
     }
     return q
  }
  mylayers_evol.forEach(l => l.steps= l.steps?l.steps:quantiles_ratio_evol(`${l.denom}_${l.name}`,l.denom))

  mylayers = mylayers.concat(mylayers_evol);

  function onlyUnique(value, index, self) {
   return self.map(v=>v.name).indexOf(value.name) === index;
  }



  // generation des noms de variables et remplissage des menus
  d3.select("#vars").selectAll("options")
    .data(mylayers.filter(onlyUnique))
    .enter()
    .append("option")
    .attr("value", d => `${d.name}`)
    .attr("id", d => `og${d.name}`)
    .html(d=>d.text)


  // generation des divs et de la structure des legendes
  mylayers.forEach(function(l){

    ld = d3.select("#layers-controls").append("div")
    	.attr("class","legend-container")
    	.attr("id",l.name+'_'+l.year+"-div")
    	.style("display","none")


    lgcv = ld.append("div").style("width","95%").style("position","relative")
    lgcv.append("div")
    	.attr("class","cval-group")
    	.attr("id",'cval-'+l.name+'_'+l.year)
    	.style("display","none")
    	.style("top","-1.8em")
    
    lgcv.append("div")
    	.attr("class","cval-group")
    	.attr("id",'cvalarrow-'+l.name+'_'+l.year)
    	.style("top","-0.8em")
    	.style("display","none")
    	.html("&darr;")


    ld.append("div")
    	.attr("class","legend-group")
    	.attr("id",'leg-'+l.name+'_'+l.year)
    	
    ld.append("div").style("text-align","right").style("width","95%").append("label")
    	.attr("class","legend-label")
    	.attr("for",l.name+'_'+l.year)
    	.text(` en (${l.unit})`)
  })


  map.on('load', function () {


    map.addSource('point',{
        type: 'vector',
        //url: 'https://www.comeetie.fr/tileserver-php/tileserver.php?/inseedata20152017allregcircle.json',
        tiles:["https://www.comeetie.fr/tileserver-php/tileserver.php?/inseedata20152017allregcircle.json?/inseedata20152017allregcircle/{z}/{x}/{y}.pbf"],
        promoteId:{"inseedata20152017allregcircle": "id"},
        maxzoom:11,
    })

    map.addSource('carreaux',{
        type: 'vector',
        //url: 'https://www.comeetie.fr/tileserver-php/tileserver.php?/inseedata20152017allregcirclenew.json',
        tiles:["https://www.comeetie.fr/tileserver-php/tileserver.php?/inseedata20152017allreg.json?/inseedata20152017allreg/{z}/{x}/{y}.pbf"],
        promoteId:{"inseedata20152017allreg": "id"},
        maxzoom:11,
    })


    mylayers.forEach(function(l){

      if(l.type=="step"){
          
          // creation de la coloramp
          l.coloramp = ["step",l.expression]
          l.steps.forEach(function(q,i){
            if(i==0){
              l.coloramp.push(l.cols[i]); 
            }else if(i<(l.steps.length-1)){
              l.coloramp.push(q)
              l.coloramp.push(l.cols[i]);
            }
          })
          let cdenom = l.denom=="men"|l.denom=="log"?"men":"ind";
          let cyear = l.year=="evol"?"2015":l.year;
          map.addLayer({
              "id": l.name+"_"+l.year+"_circle",
              "type": "circle",
              "source": "point",
              "source-layer": "inseedata20152017allregcircle",
              "paint": {
                  "circle-radius":['*',['^',['min',['*',['/',['to-number',['get',`${cdenom}_${cyear}`]],['get', 'area']],1000000],1000],0.5],0.1897367],
                  "circle-color":l.coloramp,
                  'circle-opacity': ['case',['boolean', ['feature-state', 'hover'], false],0.05,1]
              },
              "layout": {
                "circle-sort-key":['*',['get',`${cdenom}_${cyear}`],-1],
                "visibility": "visible"
              }
          },'waterway');


          map.addLayer({
              "id": l.name+"_"+l.year,
              "type": "fill",
              "source": "carreaux",
              "source-layer": "inseedata20152017allreg",
              "paint": {
                  "fill-color":l.coloramp,
                  'fill-opacity': ['case',['boolean', ['feature-state', 'hover'], false],0.05,1],
                  'fill-outline-color': ['case',['boolean', ['feature-state', 'hover'], false],"#992222",l.coloramp],
        
              },
              "layout": {
                "visibility": "visible"
              }
          },'waterway');



          // préparation / insertion de la légende
          nqt = l.steps.map((v,i)=> i>0 ? {
            width:l.steps[i]-l.steps[i-1],
            start:l.steps[i-1]} : []).flat()
          x=d3.scaleLinear().domain([0,l.steps[l.steps.length-1]-l.steps[0]]).range([0,95])
          
          while(x(nqt[0].width)>25){
            nqt[0].width = x.invert(25)
            nqt[0].start = nqt[1].start-nqt[0].width
            x=d3.scaleLinear().domain([0,nqt[nqt.length-1].start+nqt[nqt.length-1].width-nqt[0].start]).range([0,95])
          }

          while(x(nqt[nqt.length-1].width)>25){
            nqt[nqt.length-1].width = x.invert(25)
            nqt[nqt.length-1].start = nqt[nqt.length-2].start+nqt[nqt.length-2].width
            x=d3.scaleLinear().domain([0,nqt[nqt.length-1].start+nqt[nqt.length-1].width-nqt[0].start]).range([0,95])
          } 
          l.nqt = nqt
          //https://ux.stackexchange.com/questions/107318/formula-for-color-contrast-between-text-and-background
          // relative luminance 0.2126*Math.pow(94/255,2.2)+0.7152*Math.pow(79/255,2.2)+0.0722*Math.pow(162/255,2.2)
          // https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_Colors_and_Luminance
          d3.select("#leg-"+l.name+'_'+l.year)
            .selectAll("div")
            .data(nqt)
            .enter().append("div")
            .attr("class","legend-div")
            .style("width",function(d,i){return x(d.width) +"%" })
            .style("background-color",function(d,i){return l.cols[i]})
            .style("color",function(d,i){return rel_lum(l.cols[i]) < 0.1791 ? "#fff" : "#000";})
            .html((d,i)=> x(d.width)>5 & i<(nqt.length-1)?l.format(d.start+d.width):"")
      }


   
     
    // gestion de mouse hover
    mover = function (e) {
    	if (e.features.length > 0) {
    	  if (hoveredId) {
    		map.setFeatureState(
    			{ source: 'carreaux', sourceLayer:"inseedata20152017allreg",id: hoveredId },
    			{ hover: false }
    		);
    		map.setFeatureState(
    			{ source: 'point', sourceLayer:"inseedata20152017allregcircle",id: hoveredId },
    			{ hover: false }
    		);
    	  }
    	  hoveredId = e.features[0].properties.id;

        // indication de la valeure courante sur la légende
    	  let cval = extract_value(l,e.features[0].properties)
    	  let xc = d3.scaleLinear()
    	  	.domain([l.nqt[0].start,l.nqt[l.nqt.length-1].start+l.nqt[l.nqt.length-1].width])
    	  	.range([-5,95])
    	  d3.select(`#cval-${l.name}_${l.year}`)
    	  	.text(l.format(cval))
    	  	.style("display","block")
    	  	.style("left",`${Math.max(Math.min(xc(cval),95),-5)}%`)
    	  d3.select(`#cvalarrow-${l.name}_${l.year}`)
    	  	.style("display","block")
    	  	.style("left",`${Math.max(Math.min(xc(cval),95),-5)}%`)
    	  map.setFeatureState(
    	    { source: 'carreaux', sourceLayer:"inseedata20152017allreg",id: hoveredId },
    	    { hover: true }
    	  );
    	  map.setFeatureState(
    	    { source: 'point', sourceLayer:"inseedata20152017allregcircle",id: hoveredId },
    	    { hover: true }
    	  );
    	}
    }
    
    
    map.on('mousemove',l.name+'_'+l.year+"_circle",mover);
    map.on('mousemove',l.name+'_'+l.year,mover);
   

    mout = function () {
    	if (hoveredId) {
    	  map.setFeatureState(
    		{ source: 'carreaux', sourceLayer:"inseedata20152017allreg", id: hoveredId },
    		{ hover: false }
    	  );
    	  map.setFeatureState(
    		{ source: 'point', sourceLayer:"inseedata20152017allregcircle", id: hoveredId },
    		{ hover: false }
    	  );
    	}
    	d3.select(`#cval-${l.name}_${l.year}`).style("display","none")
    	d3.select(`#cvalarrow-${l.name}_${l.year}`).style("display","none")
    	hoveredId = null;
    }
    
    
    map.on('mouseleave', l.name+'_'+l.year+"_circle", mout);
    map.on('mouseleave', l.name+'_'+l.year, mout);
    



    })
    
    // affichage du layer par défaut
    updateLayers()
    changeLayer("snv")
  })

});

// petite fonction pour le contraste du texte sur la légende
function rel_lum(col){
  rgb = d3.rgb(col)
  return 0.2126*Math.pow(rgb.r/255,2.2)+0.7152*Math.pow(rgb.g/255,2.2)+0.0722*Math.pow(rgb.b/255,2.2);
}

// update des layers de contexte
function updateLayers(){
	if (document.getElementById('roads').checked){
		roadsLayers.forEach(function(l){map.setLayoutProperty(l, 'visibility', 'visible')});
	}else{
		roadsLayers.forEach(function(l){map.setLayoutProperty(l, 'visibility', 'none')});
	}

	if (document.getElementById('boundaries').checked){
		boundariesLayers.forEach(function(l){map.setLayoutProperty(l, 'visibility', 'visible')});
	}else{
		boundariesLayers.forEach(function(l){map.setLayoutProperty(l, 'visibility', 'none')});
	}
	if (document.getElementById('labels').checked){
		labelsLayers.forEach(function(l){map.setLayoutProperty(l, 'visibility', 'visible')});
	}else{
		labelsLayers.forEach(function(l){map.setLayoutProperty(l, 'visibility', 'none')});
	}
	if (document.getElementById('landcovers').checked){
	    landcoverLayers.forEach(function(l){map.setLayoutProperty(l, 'visibility', 'visible')});
	}else{
	    landcoverLayers.forEach(function(l){map.setLayoutProperty(l, 'visibility', 'none')});
	}
}


// update des variables
function changeLayer(new_layer){
  //console.log(new_layer)
  let year =  $('#years').find(":selected").val()
  let bool_circle = document.getElementById('geomcheck').checked?"_circle":"";
  console.log(bool_circle)
  //console.log(year)
  mylayers.forEach(function(l){
    map.setLayoutProperty(l.name+'_'+l.year+"_circle", 'visibility','none');
    map.setLayoutProperty(l.name+'_'+l.year, 'visibility','none');
    if (new_layer === l.name & year===l.year){
      console.log([l.name,l.year])
      map.setLayoutProperty(l.name+'_'+l.year+bool_circle, 'visibility', 'visible');
      l.visibility="visible";
      $('#'+l.name+'_'+l.year+'-div').css('display', "block");
      
      let leg_circle = l.denom=="men"|l.denom=="log"?"en (Men/Km<span class='sup'>2</span>)":"en (Hab/Km<span class='sup'>2</span>)";
      d3.select("#circle-unit").text(leg_circle)
    }else{
      map.setLayoutProperty(l.name+'_'+l.year+bool_circle, 'visibility', 'none');
      l.visibility="none";
      $('#'+l.name+'_'+l.year+'-div').css('display', "none");
    }
  })
}


// update du millesime
function changeYear(new_year){
  //console.log(new_year)
  let layer =  $('#vars').find(":selected").val()
  let bool_circle = document.getElementById('geomcheck').checked?"_circle":"";
  //console.log(layer)
  mylayers.forEach(function(l){
    map.setLayoutProperty(l.name+'_'+l.year, 'visibility','none');
    map.setLayoutProperty(l.name+'_'+l.year+"_circle", 'visibility','none');
    if (layer === l.name & new_year===l.year){
      console.log([l.name,l.year])
      map.setLayoutProperty(l.name+'_'+l.year+bool_circle, 'visibility', 'visible');
      l.visibility="visible";
      $('#'+l.name+'_'+l.year+'-div').css('display', "block");
    }else{
      map.setLayoutProperty(l.name+'_'+l.year+bool_circle, 'visibility', 'none');
      l.visibility="none";
      $('#'+l.name+'_'+l.year+'-div').css('display', "none");
    }
  })

}

// update du millesime
function changeGeom(){
  let layer =  $('#vars').find(":selected").val()
  let year =  $('#years').find(":selected").val()
  let bool_circle = document.getElementById('geomcheck').checked?"_circle":"";
  //console.log(layer)
  mylayers.forEach(function(l){
    map.setLayoutProperty(l.name+'_'+l.year, 'visibility','none');
    map.setLayoutProperty(l.name+'_'+l.year+"_circle", 'visibility','none');
    if (layer === l.name & year===l.year){
      console.log([l.name,l.year])
      map.setLayoutProperty(l.name+'_'+l.year+bool_circle, 'visibility', 'visible');
      l.visibility="visible";
      $('#'+l.name+'_'+l.year+'-div').css('display', "block");
    }else{
      map.setLayoutProperty(l.name+'_'+l.year+bool_circle, 'visibility', 'none');
      l.visibility="none";
      $('#'+l.name+'_'+l.year+'-div').css('display', "none");
    }
  })
}


// fonction d'extraction du geojson intégré aux tuiles
function togeoJson(feat){
	var seen = {}
	return feat.map(function(cv){
		if (!seen.hasOwnProperty(cv.properties.id)){
	 		seen[cv.properties.id]=true;
			ccg = {}
			ccg.geometry   = JSON.parse(cv.properties.geojson);
			ccg.properties = cv.properties;
			ccg.type = "Feature"
			return ccg;
		}else{
			return false
		}}).filter(function(cv){return cv})
}


// recupération des tuiles affichées et conversion en geojson
function exportData(){
  if(document.getElementById('geomcheck').checked){
    car=map.querySourceFeatures("point",{
            sourceLayer: 'inseedata20152017allregcircle',
            filter: ['all']
    })
  }else{
        car=map.querySourceFeatures("carreaux",{
            sourceLayer: 'inseedata20152017allreg',
            filter: ['all']
    })
  }
	return {features:togeoJson(car),type:"FeatureCollection"}
}

// téléchargement du fichier
function download_file(name, jsonData ){
	console.log("download")
	// nom du fichier
  var format = d3.timeFormat("%d-%m-%Y-%H-%M-%S")
	let d = new Date();
	name = `francepixels_${$('#vars').find(":selected").val()}_${format(d)}.geojson`

  // construction du fichier et lancement du téléchargement
  var blob = new Blob([JSON.stringify(jsonData, null, 2)], {type : 'application/json'});
  var dlink = document.createElement('a');
	document.body.appendChild(dlink);
  dlink.download = name;
  dlink.href = window.URL.createObjectURL(blob);
  dlink.onclick = function(e) {
    // revokeObjectURL needs a delay to work properly
    var that = this;
    setTimeout(function() {
  		console.log("revokeURL")
      window.URL.revokeObjectURL(that.href);
  		that.remove()
    }, 1500);
  };
	console.log("downloaded")
  dlink.click();
}

function handleFileSelect(evt) {
	var file = evt.target.files[0]; // Read first selected file
	 
	var reader = new FileReader();
	 
	reader.onload = function (theFile) {
		// Parse as (geo)JSON
		var geoJSONcontent = JSON.parse(theFile.target.result);
		 
		// Add as source to the map
		if(!map.getSource("uploaded-source")){
			map.addSource('uploaded-source', {
				'type': 'geojson',
				'data': geoJSONcontent
			});
		}else{
			let old_data = map.getSource("uploaded-source")._data
			old_data.features = old_data.features.concat(geoJSONcontent.features)
			map.removeLayer('uploaded-polygons')
		}
		
		console.log(geoJSONcontent)
		
		map.addLayer({
			'id': 'uploaded-polygons',
			'type': 'line',
			'source': 'uploaded-source',
			'paint': {
				'line-color': '#444444',
				'line-width':2.5,
			},
		// filter for (multi)polygons; for also displaying linestrings
		// or points add more layers with different filters
		'filter': ['==', '$type', 'Polygon']
		});
		
		// zoom
		let coords = geoJSONcontent.features.filter( f=> f.geometry.type=="Polygon").map(f=>f.geometry.coordinates).flat().flat();
		var bounds = coords.reduce(function (bounds, coord) {
			return bounds.extend(coord);
		}, new maplibregl.LngLatBounds(coords[0], coords[0]));
		console.log("zoom")
		map.fitBounds(bounds, {padding: 20});
		
	};
	 
	// Read the GeoJSON as text
	reader.readAsText(file, 'UTF-8');
	
		
}
 
document
.getElementById('file')
.addEventListener('change', handleFileSelect, false);
