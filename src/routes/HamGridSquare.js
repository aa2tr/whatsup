// HamGridSquare.js
// Copyright 2014 Paul Brewer KI6CQ
// License:  MIT License http://opensource.org/licenses/MIT
//
// Javascript routines to convert from lat-lon to Maidenhead Grid Squares
// typically used in Ham Radio Satellite operations and VHF Contests
//
// Inspired in part by K6WRU Walter Underwood's python answer
// http://ham.stackexchange.com/a/244
// to this stack overflow question:
// How Can One Convert From Lat/Long to Grid Square
// http://ham.stackexchange.com/questions/221/how-can-one-convert-from-lat-long-to-grid-square
//

let latLonToGridSquare = function(param1,param2){
    var lat=-100.0;
    var lon=0.0;
    var adjLat,adjLon,GLat,GLon,nLat,nLon,gLat,gLon,rLat,rLon;
    var U = 'ABCDEFGHIJKLMNOPQRSTUVWX'
    var L = U.toLowerCase();

    function toNum(x){
      if (typeof(x) === 'number') return x;
      if (typeof(x) === 'string') return parseFloat(x);
      // dont call a function property here because of binding issue
      throw "HamGridSquare -- toNum -- can not convert input: "+x;
    }

    lat = toNum(param1);
    lon = toNum(param2);

    if (isNaN(lat)) throw "lat is NaN";
    if (isNaN(lon)) throw "lon is NaN";
    if (Math.abs(lat) === 90.0) throw "grid squares invalid at N/S poles";
    if (Math.abs(lat) > 90) throw "invalid latitude: "+lat;
    if (Math.abs(lon) > 180) throw "invalid longitude: "+lon;
    adjLat = lat + 90;
    adjLon = lon + 180;
    GLat = U[Math.trunc(adjLat/10)];
    GLon = U[Math.trunc(adjLon/20)];
    nLat = ''+Math.trunc(adjLat % 10);
    nLon = ''+Math.trunc((adjLon/2) % 10);
    rLat = (adjLat - Math.trunc(adjLat)) * 60;
    rLon = (adjLon - 2*Math.trunc(adjLon/2)) *60;
    gLat = L[Math.trunc(rLat/2.5)];
    gLon = L[Math.trunc(rLon/5)];
    return GLon+GLat+nLon+nLat+gLon+gLat;
}

let gridSquareToLatLon = function(grid){
    var returnLatLonConstructor = (typeof(LatLon)==='function');
    var lat=0.0,lon=0.0,aNum="a".charCodeAt(0),numA="A".charCodeAt(0);
    function lat4(g){
      return 10*(g.charCodeAt(1)-numA)+parseInt(g.charAt(3))-90;
    }
    function lon4(g){
      return 20*(g.charCodeAt(0)-numA)+2*parseInt(g.charAt(2))-180;
    }
    if ((grid.length!=4) && (grid.length!=6)) throw "gridSquareToLatLon: grid must be 4 or 6 chars: "+grid;
    if (/^[A-X][A-X][0-9][0-9]$/.test(grid)){
      lat = lat4(grid)+0.5;
      lon = lon4(grid)+1;
    } else if (/^[A-X][A-X][0-9][0-9][a-x][a-x]$/.test(grid)){
      lat = lat4(grid)+(1.0/60.0)*2.5*(grid.charCodeAt(5)-aNum+0.5);
      lon = lon4(grid)+(1.0/60.0)*5*(grid.charCodeAt(4)-aNum+0.5);
    } else throw "gridSquareToLatLon: invalid grid: "+grid;
    if (returnLatLonConstructor) return new LatLon(lat,lon);
    return [lat,lon];
};

let  HamGridSquare = {
    toLatLon: gridSquareToLatLon,
    fromLatLon: latLonToGridSquare
};

export { HamGridSquare as default };