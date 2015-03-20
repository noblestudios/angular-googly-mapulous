# Angular Googly Mapulous

Yeah, I dunno, it had to have a name of some kind.

## What's this then

We write a lot of Google Maps stuff around [these parts](http://noblestudios.com).  They usually boil down to some combination of the following functionality:

- Custom markers with labels
- Marker clustering
- Custom infowindows
- Overlays, polygon, image or otherwise

This is a set of tools intended to make those basic tasks easier to get up and going.  It's also meant to make sure all of these things work within Angular.  To that end:

- Generated maps can be fully controlled from an outer scope
- Infobox content can be fully controlled from an outer scope
- Data can be easily passed from map markers and clusters to the outer scope (so feel free to go nuts with ng-repeat inside an infobox if you like)

## Dependencies

- [Angular](https://angularjs.org/)
- [Google Maps API](https://developers.google.com/maps/)
- [Google Maps Geometry](https://developers.google.com/maps/documentation/javascript/geometry)
- [InfoBox/MarkerWithLabel](https://code.google.com/p/google-maps-utility-library-v3/) (Google Code will be dying soon, after which I assume look for a Github page of the same name)
- [jScrollPane](http://jscrollpane.kelvinluck.com/) (optional, only needed if you want scrollable infoboxes)

jQuery is not required except for jScrollPane.

## Structure

The package consists of two major components - a directive (googleMap) and a service (googleMaps).  The directive references the service and can be used to drop a simple google map wherever one is needed:

```
<google-map></google-map>
```

Nothing exotic there.

The map created by the directive can be controlled in the outer scope.  To extend the map functionality, just include the service in the controller:

```
App.controller( 'Map', [ '$scope', 'googleMaps', function( $scope, googleMaps ) {
  // Set map config options - these will be referenced prior to map creation
  $scope.mapConfig = {
    zoom: 12
  };

  $scope.$on( 'googleMapLoaded', function ( $event, map ) {
    // Lovely, the map is ready.  Do map things!
  });
}]);
```

Note the mapConfig var, which can be used to pass any options into the map constructor.  Also note the map loaded event - put any custom map code inside here.

Once the map is loaded, the service can be used for advanced functionality.  See the examples.

## Documentation

Full generated documentation is available in ./docs.

## Build

The library can be build using Grunt:

```
grunt build
```

or simply:

```
grunt
```
