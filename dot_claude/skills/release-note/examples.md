# Reference release notes

Past MapsIndoors announcements. Match the closest one's shape, tone and level of detail.

## Android SDK

```
:android:  MapsIndoors Android SDK 4.24.0 released :android:

Added

Initial view. When the solution has an initial view enabled in the CMS, the map opens on the solution's venue before its data has loaded, instead of on the map engine's world view.
The SDK moves the camera itself once the MPMapConfig is built, and only until MapControl is created. A map built after MapsIndoors.load(...) has reported ready is never moved.
On a solution with several venues, name the venue to open on with MPMapConfig.Builder.setInitialVenue(administrativeId). Without it, the map opens as it did before.
MapsIndoors.getStoredInitialView(context, apiKey) returns the initial view saved by an earlier launch without a network call, so your app can make its very first frame the venue. Google Maps: MPInitialViewConverter.toInitialCameraPosition(initialView, viewWidthDp, viewHeightDp, administrativeId) turns it into a camera for GoogleMapOptions.camera(...). Mapbox: MPInitialViewConverter.toInitialCameraOptions(initialView, viewWidthDp, viewHeightDp, administrativeId) does the same for MapInitOptions.
MapsIndoors.getInitialView(context, apiKey, listener) and MapsIndoors.getInitialView(context, apiKey) (a CompletableFuture, API 24+) fetch it on demand, and can be called before MapsIndoors.load(...). They give null when the solution has no initial view, and an MIError.NETWORK_ERROR when the device is offline or no answer arrives within 3 seconds.
New types MPInitialView and MPVenueStub describe the venues that can be framed.

Mapbox: MapboxMap.loadMapsIndoorsStyle(onStyleLoaded) loads the MapsIndoors style straight away, so the style is not loaded a second time when the MPMapConfig is built.
MapsIndoorsException.getError() returns the MIError behind the exception, when there is one.

Changed

MPIMapConfig's protected constructor now takes (mapProvider, context, mapView) in place of the no-arg one, which only affects custom map providers. The Google Maps and Mapbox adapters are updated, so keep them on the same version as the SDK.
MPIMapConfig.getMapProvider() can return null once the config has been destroyed. In Kotlin, mapConfig.mapProvider is now MPIMapProvider?, so code such as mapConfig.mapProvider.cameraOperator needs a null check (mapConfig.mapProvider?.cameraOperator).
Drawing a route no longer waits for its icons to download. A route whose icons are not cached yet (start and end markers, floor-change and entrance icons, and a custom route stamp) is drawn straight away, and each icon appears once it has downloaded. Before, each such icon could hold up drawing the route for up to 3 seconds.
The SDK runs at most 48 of its MISDKPool-N background threads at once, where before their number had no limit. Work beyond that waits for a thread to come free.
Mapbox: moving the camera no longer makes Mapbox re-process MapsIndoors locations, walls, extrusions and floor plans whose content has not changed, which reduces the map's work while panning and zooming.

Fixed

Fixed a crash during MapsIndoors.load(...) when a solution contains a venue or building without a name. A single unnamed venue or building brought down the whole load, not just itself. Such a venue or building is now loaded and can be found by id, but not by name, and a warning in the log names it so the underlying data problem stays visible. The same applies to a category with no name, which is now listed under its key, and to a null entry in a venue's or building's alias list, which is ignored.
Fixed MapsIndoors.load(...) never calling back, a dataset sync re-downloading its dataset indefinitely, and a crash, when the backend serves a dataset scope the SDK cannot read. The load now completes, and MPDataSetCacheManager.synchronizeDataSets(...) tries once more and then reports MPDataSetManagerStatus.SYNC_FAILED. A dataset that had never synced previously crashed the app in this case rather than failing the sync. A scope that cannot be read also no longer turns off the dataset's offline tiles: the previously synced scope is kept until one can be read again.
With MPDebugLog.enableDeveloperMode(true), calling MapsIndoors.load(...) again or MapsIndoors.destroy() shortly after a load or content synchronisation could crash the app with a MapsIndoorsException ("MapsIndoors SDK hasn't been initialized") on the MISDKLocationServiceThread thread.
With the user's position shown on the map, the default floor selector marked the wrong floor, or no floor, as the floor the user is on. Custom floor selectors were not affected.
Icons and 2D models given by URL.
An image that failed to download, for example while the device was offline, was not downloaded again until MapsIndoors.destroy(), so a display rule given the same URL afterwards went without it. The next display rule given that URL now downloads it again.
MPDisplayRule.getIconAsync(listener) could return the SDK's default icon instead of the rule's own when another display rule was still downloading the same icon. It now waits for that download to finish.

Mapbox: since 4.20.0, a MapControl created on a MapView that an earlier MapControl had used showed none of a floor's MapsIndoors content (icons, labels, areas, walls, extrusions, floor plans, 2D and 3D models) on any floor except the one the earlier MapControl last showed. This affected apps that destroy their MapControl and create a new one on the same MapView, for example after loading MapsIndoors again.
Mapbox: since 4.11.3, MapControl.onDestroy() left the MapsIndoors content (icons, labels, areas, walls, extrusions, floor plans, 2D and 3D models, routes and the blue dot) on a MapView the app kept. It now removes it, and leaves layers, sources and images the app added itself in place.
Mapbox: MapControl.onDestroy() left the destroyed MapControl's map handling registered on a MapView the app kept, where it held memory and kept receiving map events until the MapView was destroyed. Every MapControl created and destroyed on the same MapView, for example after loading MapsIndoors again, added another.
```

## iOS SDK

```
:mapsindoors-ios-pine:MapsIndoors iOS SDK 4.23.0 released:mapsindoors-ios-pine:

Added
• Location icons can now grow as the user zooms in [Mapbox only]. The solution sets a zoom band, and each icon grows across that band up to the factor set on its display rule; a label keeps clear of its icon as the icon grows.
    ◦ 'MPDisplayRule.iconZoomFactor' sets the factor an icon reaches at the top of the band. It defaults to '1.0', which leaves the icon unchanged, and must be above '0' and at most '4'.
    ◦ 'MPSolutionConfig.iconScaleZoomFrom' and 'iconScaleZoomTo' hold the band, and 'iconScaleZoomBand' returns it as an 'MPIconScaleZoomBand'. A solution with no band set does not scale its icons, and an invalid band turns scaling off.
• Apps can now make the camera moves the SDK performs instant for every user, through the new 'MPMapConfig.cameraAnimationsEnabled': selecting a location, 'goTo(entity:)', fitting a highlight or filter, tapping a cluster, and fitting a route on screen. It defaults to 'true' and does not affect the user's own gestures.
• With VoiceOver running, the map now announces floor changes, the selected location, highlighted locations, and when a route or a different route leg is shown.

Changed
• Camera moves performed by the SDK now respect the Reduce Motion setting in iOS Accessibility, and are applied instantly while it is on. 'MPDirectionsRendererOptions.forceAnimation' still animates the route fit, unless 'cameraAnimationsEnabled' is 'false'.
• Text in the floor selector, the default info window and the route leg buttons now follows the user's preferred text size, up to twice its default size.
    ◦ At the default text size, a long floor name now widens the floor selector instead of being shrunk to fit, and the floor holding the user's position is shown in bold at the same size as the other floor names.

Fixed
• Calling 'clearHighlight()', or 'setHighlight' again, right after 'setHighlight' could leave the earlier highlight on the map and still move the camera to it. The earlier highlight is now discarded.
• A route request made while the device is offline now fails with an error when the route network cannot be loaded, instead of never completing.
• 'fetchAuthDetails()' no longer hangs when it is called again before the authentication details arrive, or when 'load(apiKey:)' is called while it waits.
```

## React Native SDK

```
:rocket: MapsIndoors React Native SDK 2.9.1 released :ios: :react: :android:

Fixed
• iOS: MapControl and MPDirectionsRenderer calls no longer crash the app. This includes showUserPosition on first map open
• Route stop icons from MPRouteStopIconConfig no longer fail with "Invalid URL" on Expo 55
• A slow URL-icon setRoute no longer redraws over a later setRoute or clear
• MPCameraPosition.create no longer swaps tilt and bearing

Changed
• MapsIndoors Android and iOS SDKs updated to 4.23.0
• iOS: promises settle after the map applies the call, and getCurrent* getters resolve null without a map control
• iOS: SDK camera moves are instant when Reduce Motion is on
• MPRouteStopIconConfig.getImage() returns a string instead of a URL
```

## Web SDK / Components / Map Template

### Map Template 1.99.36 / Components 13.37.7 (posted 2026-10-27)

```
Web SDK / Components / Map Template Release :tada:

Map Template 1.99.36 is out with search results past the first 100, a clickable MapsPeople logo, link-copy notifications and a Kiosk reset fix.

We shipped Map Template 1.99.36:

- Live on map-latest now, will be promoted to stable later

Added
- Search results are shown in batches of 100. A "Show more results" button at the end of the list shows the next 100 in the list and on the map.
- Clicking the MapsPeople logo on the map, or pressing Enter on it, opens mapspeople.com in a new tab.
    - The link is off in Kiosk mode.
    - On mobile, the logo and chat button now sit above the collapsed bottom sheet, so the logo stays visible.
- Copying a location link shows "Link copied", or "Could not copy link" if the copy fails. Only one notification shows at a time.

Changed
- Category results are sorted alphabetically across all results, not only the first 100.
- With a category selected, the map fits to the results shown and fits again each time more are shown.
- With a category selected, changing floor fits the map to the category's locations in the current building.

Fixed
- The Kiosk reset button returns to the configured start view (kiosk floor, startZoomLevel, pitch and bearing). Before, it zoomed in close to the kiosk and kept the current rotation and tilt.
- Wayfinding search for addresses and places (Mapbox and Google Places) now favours results near the venue when the device position is unknown.
- Locations with a Live Data badge show their badged icon in the search results list instead of an empty icon.

We shipped Components 13.37.7:

- mi-search: address and place results (Mapbox and Google Places) are biased towards the device position, or towards the mi-near location when the device position is unknown. Before, Google results had no location bias, and Mapbox results had none without a device position.
- mi-list-item-location: the icon prop accepts an image element as well as a URL string, so Live Data badged icons no longer render empty.
```


```
Web SDK / Components / Map Template Release :tada:

Web SDK 4.62.0 is out, with zoom-responsive icon scaling: location icons can now grow as users zoom in, so they stay readable at high zoom.

We shipped Web SDK 4.62.0:

Icon zoom scaling (Mapbox v3 only): icons grow between the solution's "Scale from" / "Scale to" zoom levels, by each display rule's "Zoom scaling" value
Labels move outwards as icons grow, so they don't end up under the icon
Selection pins and badges grow with their icon; a badge shown without an icon keeps its normal size
Solutions using the dynamicIconScaling module: when icon scaling is on, it takes over and the module's collision handling is turned off; without icon scaling the module works as before
Graphic labels on Mapbox: overlapping labels now hide and the nearer one stays, a label is no longer hidden by its own icon, and icons on graphic labels still hide when they overlap
Graphic labels on Mapbox v3: a selection pin or route start/end marker no longer hides a location's graphic label, and hovering a graphic label no longer hides its neighbours
Faster location loading and viewport updates (display rules are normalized once instead of twice)

We shipped Components 13.37.4:

mi-map-mapbox: floating labels no longer disappear next to their icon when a larger text size is set in the CMS (MS-4006)
mi-map-mapbox: labels now use the text size and position set in the CMS (Top, Left and Right work too). Before, labels were always 11px and pushed 14px down. The default is now 12px and labels sit slightly further from their icon.

We shipped Map Template 1.99.34:

Updated to Web SDK 4.62.0
Live on map-latest now, will be promoted to stable later
```

## CMS (small)

```
CMS Release :tada:

Added

List View search now also finds locations by their Location Type name, in any language. Matching ignores case and accents.
The search placeholder now reads "Name, Type, ID, Aliases or ExternalID".

Fixed

The "Show more" button on the Map filter chips no longer stays disabled when your first filter selection creates more than one row of chips.
The Obstacle display filter no longer misses Areas that are obstacles because of their Location Type, which were shown under Area instead. This happened on the first filter applied after the page loaded.
```

## CMS (headline feature)

```
CMS Release :tada: Microsoft Places integration
A building in MapsIndoors can now be published straight into a customer's Microsoft 365 tenant. Rooms, workspaces and desks appear in Microsoft Places, Outlook and Teams, with the MapsIndoors map drawn underneath, and employees find and book them there. Until now customers took our IMDF export and loaded it into Places by hand.

Added

App Settings → Microsoft Places in the CMS (Administrator role). Connect a customer's tenant once; their admin approves MapsIndoors and runs a short setup script. No user credentials, no access to mail or calendars, revocable by the customer at any time.
Two modes per building: Attach adds the map to a building the customer already has in Places. Managed creates and keeps up to date the building, floors, sections, rooms, workspaces, desks and map from MapsIndoors data.
Operator chooses what each Location Type becomes in Places (room, workspace, desk, bookable desk, map only) and whether places are bookable. Nothing is preselected.
Every publish starts with a preview of exactly what will change. Nothing reaches Microsoft until the operator confirms.
Republish whenever the data changes; only the difference is sent. Renames, capacity changes and removals carry through.
Remove a building from Places, or disconnect the customer, from the same page.

Good to know

Microsoft's timings: rooms take up to 24 hours to show in Outlook/Teams, maps up to 1 hour.
Publishing is on demand; there is no scheduled sync.
Bookable desks need a Microsoft space licence per desk. Rooms and workspaces are covered by most M365 plans.
A building needs named rooms, Location Types on everything, and a full venue address, or it won't publish.

Status
Off for every customer. Enabled per customer with the microsoft-places module; we're starting with a small early-access group. Check with me before turning it on for anyone.

What to tell customers
It's here and in early access. If they use Microsoft Places, or lost interest in us because we didn't have this, we want to hear about it. Onboarding guide and walkthrough film are in Confluence under Microsoft Places integration.

Credits
Lots of special thanks to @<name> for designing and building this for the CMS over the last couple of weeks after the POC validation, and @<name> for doing the initial feasibility study and laying the groundwork :extreme-teamwork:
```

## Backend

```
Backend Releases :tada:

Fixed:

Show Network in the CMS is much faster for large automatic graphs. Connecting elevators, stairs, and ramps used to search the whole building graph for every landing. It now looks up only the corridors in that room.

King Abdullah Sport City Stadium was the slow case we measured. Show Network went from about 56 seconds to about 6 seconds. Almost all of that was attaching the connectors: about 51 seconds before, under a second after. The graph came out the same size, 37,637 nodes and 44,891 edges, so the routes themselves did not change. Connectors still snap to the closest corridor they can see.

Please DM me @<name> when you and your team have a chance to test it and see if there is a visible difference. This change is applied to all solutions. I hope this change will make map creation processes smoother :slightly_smiling_face:
```

## CMS + Backend

```
CMS/BE Release :tada:

Zoom-responsive icon scaling: location icons can now grow as users zoom in, so they stay readable at high zoom instead of looking tiny next to the rooms they belong to.

We shipped BE:

New display rule field: imageZoomFactor (how much an icon grows), on the main display rule, location types and locations
New solution config fields: iconScaleZoomFrom / iconScaleZoomTo (the zoom range the growth happens over)
Validation: factor must be > 0 and ≤ 4; zoom range must be 1 ≤ from < to ≤ 24

We shipped CMS:

Display rule editor → Icon: new "Zoom scaling" setting (main display rule, type and location, with inheritance and "push to type")
Solution Settings → Map Behavior: new "Icon zoom scaling" section with "Enable Icon zoom scaling", "Scale from zoom level" and "Scale to zoom level"
Mapbox solutions only; the settings are hidden for Google Maps solutions
Display rule editor: the unsaved-changes bar can be hidden again and stays lined up with the panel

Nothing changes for existing solutions: scaling stays off until it's turned on.
```
