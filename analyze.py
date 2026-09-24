import csv
import math
from collections import defaultdict

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def main():
    gtfs_dir = 'e:/code/anavandi/data/gtfs/'
    
    # 1. Stops
    stops = {}
    thrip_stops = set()
    info_stops = set()
    with open(gtfs_dir + 'stops.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            stop_id = row['stop_id']
            name = row['stop_name']
            stops[stop_id] = name
            lower_name = name.lower()
            if 'thrip' in lower_name or 'trip' in lower_name:
                thrip_stops.add(stop_id)
            if 'info' in lower_name or 'park' in lower_name:
                if 'changampuzha' not in lower_name and 'federal' not in lower_name and 'subash' not in lower_name and 'children' not in lower_name:
                    info_stops.add(stop_id)

    # 2. Stop Times
    # trip_id -> list of (stop_sequence, stop_id)
    trip_stops = defaultdict(list)
    with open(gtfs_dir + 'stop_times.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trip_stops[row['trip_id']].append((int(row['stop_sequence']), row['stop_id']))

    for trip_id in trip_stops:
        trip_stops[trip_id].sort()

    # 3. Find matching trips
    matching_trips = set()
    for trip_id, stops_seq in trip_stops.items():
        trip_stop_ids = {s[1] for s in stops_seq}
        if trip_stop_ids.intersection(thrip_stops) and trip_stop_ids.intersection(info_stops):
            matching_trips.add(trip_id)

    # 4. Trips metadata
    trip_metadata = {}
    route_shapes = {}
    with open(gtfs_dir + 'trips.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['trip_id'] in matching_trips:
                trip_metadata[row['trip_id']] = row
                route_shapes[row['route_id']] = row['shape_id']

    # 5. Routes metadata
    routes = {}
    with open(gtfs_dir + 'routes.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            routes[row['route_id']] = row

    # 6. Shapes distance
    shape_points = defaultdict(list)
    with open(gtfs_dir + 'shapes.txt', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            shape_points[row['shape_id']].append((
                int(row['shape_pt_sequence']),
                float(row['shape_pt_lat']),
                float(row['shape_pt_lon'])
            ))
    
    shape_distances = {}
    for shape_id, points in shape_points.items():
        points.sort()
        dist = 0.0
        for i in range(1, len(points)):
            dist += haversine(points[i-1][1], points[i-1][2], points[i][1], points[i][2])
        shape_distances[shape_id] = dist

    # Group by route and direction to avoid printing duplicates
    # route_id, direction_id -> trip_id
    seen_routes = {}
    for trip_id in matching_trips:
        meta = trip_metadata[trip_id]
        key = (meta['route_id'], meta['direction_id'])
        if key not in seen_routes:
            seen_routes[key] = trip_id

    for (route_id, direction_id), trip_id in seen_routes.items():
        route = routes[route_id]
        meta = trip_metadata[trip_id]
        shape_id = meta['shape_id']
        dist = shape_distances.get(shape_id, 0.0)
        
        name = route['route_long_name']
        if not name:
            name = route['route_short_name']
        if not name:
            name = meta['trip_headsign']
        
        print(f"Route ID: {route_id}")
        print(f"Route Name: {name}")
        print(f"Direction: {direction_id}")
        print(f"Approx Distance: {dist:.2f} km")
        
        seq = trip_stops[trip_id]
        print(f"Number of stops: {len(seq)}")
        stop_names = [stops.get(s[1], s[1]) for s in seq]
        print(f"Stops: {' -> '.join(stop_names)}")
        stop_ids = [s[1] for s in seq]
        print(f"Stop IDs: {', '.join(stop_ids)}")
        print("-" * 40)

if __name__ == '__main__':
    import sys
    sys.stdout = open('output_results.txt', 'w', encoding='utf-8')
    main()


