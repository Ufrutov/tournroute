/*

https://jsfiddle.net/8g3dkyxL/2/

*/


var points = [],
	msg_el = document.getElementById("msg"),
	url_osrm_nearest = "//router.project-osrm.org/nearest/v1/foot/",
	url_osrm_route = "//router.project-osrm.org/route/v1/foot/",
	icon_url = "https://openlayers.org/en/v4.6.5/examples/data/icon.png",
	vectorSource = new ol.source.Vector(),
	vectorLayer = new ol.layer.Vector({
		source: vectorSource
	}),
	styles = {
		route: new ol.style.Style({
			stroke: new ol.style.Stroke({
				width: 6,
				color: [40, 40, 40, 0.8]
			})
		}),
		icon: new ol.style.Style({
			image: new ol.style.Icon({
				anchor: [0.5, 1],
				src: icon_url
			})
		})
	};

var map = new ol.Map({
	target: "map",
	layers: [
		new ol.layer.Tile({
			source: new ol.source.OSM()
		}),
		vectorLayer
	],
	view: new ol.View({
		center: [-5685003, -3504484],
		zoom: 11
	})
});

var routeAdded = false;
var routeAB;
map.on("click", function (evt) {
	if (!routeAdded) {
		utils.getNearest(evt.coordinate).then(function (coord_street) {
			var last_point = points[points.length - 1];
			var points_length = points.push(coord_street);

			utils.createFeature(coord_street);

			if (points_length < 4) {
				msg_el.innerHTML = "Click to add another point";
				return;
			}

			//get the route
			var point1 = last_point.join();
			var point2 = coord_street.join();
			console.log(point1, point2);
			fetch(url_osrm_route + point1 + ";" + point2)
				.then(function (r) {
					return r.json();
				})
				.then(function (json) {
					if (json.code !== "Ok") {
						msg_el.innerHTML = "No route found.";
						return;
					}
					msg_el.innerHTML = "Route added";
					//points.length = 0;
					utils.createRoute(json.routes[0].geometry);
					routeAdded = true;
					routeAB = vectorSource.getFeatures()[2];
				});
		});
	} else {
		var pointX = new ol.Feature(new ol.geom.Point(evt.coordinate));
		var coordX = pointX.getGeometry().getCoordinates();
		var coordY = routeAB.getGeometry().getClosestPoint(coordX);
		var line = new ol.Feature(new ol.geom.LineString([coordX, coordY]));
		line.setStyle(styles.route);
		vectorSource.addFeature(line);
		msg_el.innerHTML = ol.Sphere.getLength(line.getGeometry()) + " metres";
	}
});

var utils = {
	getNearest: function (coord) {
		var coord4326 = utils.to4326(coord);
		return new Promise(function (resolve, reject) {
			//make sure the coord is on street
			fetch(url_osrm_nearest + coord4326.join())
				.then(function (response) {
					// Convert to JSON
					return response.json();
				})
				.then(function (json) {
					if (json.code === "Ok") resolve(json.waypoints[0].location);
					else reject();
				});
		});
	},
	createFeature: function (coord) {
		var feature = new ol.Feature({
			type: "place",
			geometry: new ol.geom.Point(ol.proj.fromLonLat(coord))
		});
		feature.setStyle(styles.icon);
		vectorSource.addFeature(feature);
	},
	createRoute: function (polyline) {
		// route is ol.geom.LineString
		var route = new ol.format.Polyline({
			factor: 1e5
		}).readGeometry(polyline, {
			dataProjection: "EPSG:4326",
			featureProjection: "EPSG:3857"
		});
		var feature = new ol.Feature({
			type: "route",
			geometry: route
		});
		feature.setStyle(styles.route);
		vectorSource.addFeature(feature);
	},
	to4326: function (coord) {
		return ol.proj.transform([parseFloat(coord[0]), parseFloat(coord[1])], "EPSG:3857", "EPSG:4326");
	}
};
