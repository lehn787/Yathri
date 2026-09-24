# Kochi GTFS Data Report

## 1. Schema Analysis

The dataset contains standard GTFS files. Below are the identified columns for each file:

*   **stops.txt**: `stop_id`, `stop_code`, `stop_name`, `stop_desc`, `stop_lat`, `stop_lon`, `zone_id`, `stop_url`, `location_type`, `parent_station`, `stop_timezone`, `wheelchair_boarding`
*   **routes.txt**: `route_id`, `agency_id`, `route_short_name`, `route_long_name`, `route_desc`, `route_type`, `route_url`, `route_color`, `route_text_color`
*   **trips.txt**: `route_id`, `service_id`, `trip_id`, `trip_headsign`, `direction_id`, `shape_id`
*   **stop_times.txt**: `trip_id`, `arrival_time`, `departure_time`, `stop_id`, `timepoint`, `stop_sequence`
*   **shapes.txt**: `shape_id`, `shape_pt_lat`, `shape_pt_lon`, `shape_pt_sequence`
*   **frequencies.txt**: `trip_id`, `start_time`, `end_time`, `headway_secs`
*   **calendar.txt**: `service_id`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`, `start_date`, `end_date`

## 2. File Relationships

The files relate to each other following the standard GTFS relational model:
*   **Routes to Trips**: `routes.txt` (`route_id`) -> `trips.txt` (`route_id`)
*   **Trips to Stop Times**: `trips.txt` (`trip_id`) -> `stop_times.txt` (`trip_id`)
*   **Stop Times to Stops**: `stop_times.txt` (`stop_id`) -> `stops.txt` (`stop_id`)
*   **Trips to Frequencies**: `trips.txt` (`trip_id`) -> `frequencies.txt` (`trip_id`) (used to define headway-based service)
*   **Trips to Calendar**: `trips.txt` (`service_id`) -> `calendar.txt` (`service_id`) (defines active days/dates)
*   **Trips to Shapes**: `trips.txt` (`shape_id`) -> `shapes.txt` (`shape_id`) (defines the geographical path)

## 3 & 4. Routes Connecting Thrippunithura and Infopark

Analysis reveals several routes connecting Thrippunithura (and variant spellings) with Infopark. Below is a summary of the unique route variations found (grouped by `route_id` and `direction_id`):

### Route ID: r13881505 | Thrippoonithura ↔ Edachira
*   **Direction**: 1 (Approx Distance: 12.99 km)
*   **Stops (36)**: Thrippunithura -> Statue Junction -> Kizhakke Kotta Junction -> Market Junction -> RCM Hospital -> Railway Station -> Chathari -> Karingachira -> Irumpanam Puthiya Road -> Irumpanam -> Makaliyam -> Post Office -> Manakkapady -> Kadathu Kadavu -> Vettikkavu -> BPCL -> Indian Oil -> Thrikathra -> Traco Cable Company -> Rajagiri -> Chittethukara -> Chittethukara -> Adarsha Junction -> CSEZ -> Eechamukk -> Akashavani Junction -> Kakkanad Civil Station -> Kakkanad District Hospital -> Shappumpady -> Lavanya -> Kuzhikattumoola Palli -> Kuzhikkattumoola -> Kusumagiri -> Kurish -> Infopark -> Edachira Junction
*   **Stop IDs**: n9344277805, n9388068945, n9379961865, n9362413274, n9362413275, n2376866788, n9362413278, n2376855121, n5757830297, n9399129074, n9399129075, n9399129077, n9399129079, n5757830524, n9399129081, n9399129082, n5757830317, n7474632252, n9399129086, n9399129087, n9399129088, n9399129089, n5757830313, n5757830310, n9399129094, n5757830308, n9333852888, n7505440821, n9399375017, n9399354514, n9399375020, n9399375021, n9399375024, n9399375025, n9399375060, n9420055176

### Route ID: r13645172 | Thrippoonithura ↔ Infopark
*   **Direction**: 0 (Approx Distance: 13.56 km)
*   **Stops (38)**: Kinfra -> InfoPark Main Gate -> Infopark First Gate -> Infopark -> Kurish -> Kusumagiri -> Kuzhikkattumoola -> Kuzhikattumoola Palli -> Lavanya -> Shappumpady -> Kakkanad District Hospital -> Kakkanad Civil Station -> Akashavani Junction -> Eechamukk -> CSEZ -> Adarsha Junction -> Chittethukara -> Chittethukara -> Rajagiri -> Traco Cable Company -> Thrikathra -> Indian Oil -> BPCL -> Vettikkavu -> Kadathu Kadavu -> Manakkapady -> Post Office -> Makaliyam -> Irumpanam -> Irumpanam Puthiya Road -> Karingachira -> Karingachira -> Chathari -> Railway Station -> RCM Hospital -> Market Junction -> Kizhakke Kotta Junction -> Thrippunithura
*   **Stop IDs**: n9399375064, n9399375062, n9399354516, n5757830293, n9399375026, n9399375023, n9399375022, n5757830311, n9399375019, n9399375018, n9398832097, n9399129070, n9399129071, n9399129093, n9399129092, n9399129091, n5757830312, n5757830315, n5757830316, n9399129085, n9399129084, n9399129083, n5757830319, n5757830318, n9399129080, n9399129078, n9399129076, n5757830295, n9399129073, n9399129072, n8318473841, n9362413279, n9362413277, n7466613954, n9362413276, n9362413273, n9356194147, n9344277805

### Route ID: r13881313 | Kinfra ↔ Thoppumpady
*   **Direction**: 0 (Approx Distance: 25.95 km)
*   **Stops (58)**: Kinfra -> InfoPark Main Gate -> Infopark First Gate -> Infopark -> Kurish -> Kusumagiri -> Kuzhikkattumoola -> Kuzhikattumoola Palli -> Lavanya -> Shappumpady -> Kakkanad District Hospital -> Kakkanad Civil Station -> Akashavani Junction -> Eechamukk -> CSEZ -> Adarsha Junction -> Chittethukara -> Chittethukara -> Rajagiri -> Traco Cable Company -> Thrikathra -> Indian Oil -> BPCL -> Vettikkavu -> Kadathu Kadavu -> Manakkapady -> Post Office -> Makaliyam -> Irumpanam -> Irumpanam Puthiya Road -> Karingachira -> Karingachira -> Chathari -> Railway Station -> RCM Hospital -> Market Junction -> Kizhakke Kotta Junction -> Thrippunithura -> Statue Junction -> Sree Venkateswara High School -> Vadakkekotta -> Menakakotta -> Petta East -> Petta -> Gandhi Square -> Jayanthi Road Junction -> Maradu -> Pallinada -> P S Mission Hospital -> Kundanoor Junction -> Kallath Temple -> Randaampadi -> Shanthi Nagar -> Maritime University -> CPT Junction -> Pyari Junction -> Kochu Palli -> Thoppumpady
*   **Stop IDs**: n9399375064, n9399375062, n9399354516, n5757830293, ... (truncating long list for readability in summary report, full list available in scratch logs)

### Route ID: r13880518 | Kinfra ↔ Thrippoonithura
*   **Direction**: 0 (Approx Distance: 13.56 km)
*   **Stops (38)**: Kinfra -> InfoPark Main Gate -> Infopark First Gate -> Infopark -> Kurish -> Kusumagiri -> Kuzhikkattumoola -> Kuzhikattumoola Palli -> Lavanya -> Shappumpady -> Kakkanad District Hospital -> Kakkanad Civil Station -> Akashavani Junction -> Eechamukk -> CSEZ -> Adarsha Junction -> Chittethukara -> Chittethukara -> Rajagiri -> Traco Cable Company -> Thrikathra -> Indian Oil -> BPCL -> Vettikkavu -> Kadathu Kadavu -> Manakkapady -> Post Office -> Makaliyam -> Irumpanam -> Irumpanam Puthiya Road -> Karingachira -> Karingachira -> Chathari -> Railway Station -> RCM Hospital -> Market Junction -> Kizhakke Kotta Junction -> Thrippunithura
*   **Stop IDs**: n9399375064, n9399375062, n9399354516, n5757830293, ...

### Route ID: r13881291 | Kinfra ↔ Kundannoor
*   **Direction**: 0 (Approx Distance: 18.95 km)
*   **Stops (50)**: Kinfra -> InfoPark Main Gate -> Infopark First Gate -> Infopark -> Kurish -> Kusumagiri -> Kuzhikkattumoola -> Kuzhikattumoola Palli -> Lavanya -> Shappumpady -> Kakkanad District Hospital -> Kakkanad Civil Station -> Akashavani Junction -> Eechamukk -> CSEZ -> Adarsha Junction -> Chittethukara -> Chittethukara -> Rajagiri -> Traco Cable Company -> Thrikathra -> Indian Oil -> BPCL -> Vettikkavu -> Kadathu Kadavu -> Manakkapady -> Post Office -> Makaliyam -> Irumpanam -> Irumpanam Puthiya Road -> Karingachira -> Karingachira -> Chathari -> Railway Station -> RCM Hospital -> Market Junction -> Kizhakke Kotta Junction -> Thrippunithura -> Statue Junction -> Sree Venkateswara High School -> Vadakkekotta -> Menakakotta -> Petta East -> Petta -> Gandhi Square -> Jayanthi Road Junction -> Maradu -> Pallinada -> P S Mission Hospital -> Kundanoor Junction
*   **Stop IDs**: n9399375064, n9399375062, n9399354516, n5757830293, ...

### Route ID: r13876903 | Kakkanad ↔ Medical College
*   **Direction**: 0 (Approx Distance: 47.48 km)
*   **Stops (104)**: Kakkanad Civil Station -> Kakkanad District Hospital -> Shappumpady -> Lavanya -> Kuzhikattumoola Palli -> Kuzhikkattumoola -> Kusumagiri -> Kurish -> Infopark -> Infopark First Gate -> InfoPark Main Gate -> Kinfra -> ... -> Thrippunithura -> ... -> Medical College -> HMT Colony -> Nuals College -> Nuals Junction
*   **Stop IDs**: n9399129096, n7505440821, n9399375017, n9399354514, n9399375020, ...

*(Note: Similar reverse direction routes exist for most of these as well. The complete stop-by-stop breakdown was generated and analyzed locally.)*

## 5. Fare Information

**Finding**: There is **no fare information** included in this GTFS dataset.

The standard GTFS files for fare data (`fare_attributes.txt` and `fare_rules.txt`) are missing from the dataset. No columns inside `routes.txt` or `trips.txt` contain any custom extensions pointing to ticket prices or fare stages. We will need an external dataset or hardcoded logic if fare assistance is to be implemented.
