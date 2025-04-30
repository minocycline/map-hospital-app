'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export default function Page() {
  const [map, setMap] = useState(null);
  const [directionsRenderers, setDirectionsRenderers] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [originMarker, setOriginMarker] = useState(null); // ★ NEW
  const [results, setResults] = useState([]);
  const [sortKey, setSortKey] = useState('distance');
  const originRef = useRef(null);
  const hospitalRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [hospitalAutocomplete, setHospitalAutocomplete] = useState(null);
  const [hospitalInputs, setHospitalInputs] = useState([
    '東京都板橋区加賀2丁目11-1 帝京大学病院',
    '東京都北区上十条2丁目13-1 十条腎クリニック',
    '東京都北区赤羽南2丁目11 望星赤羽クリニック',
    '東京都板橋区小豆沢3丁目6-7 ＮＫ志村坂上ビル2・3階 板橋石川クリニック',
    '東京都板橋区板橋2丁目67-8 板橋中央ビル8階 鶴田クリニック',
    '東京都北区滝野川7丁目5-7 アーバンフレックスSG 鶴田板橋クリニック',
    '埼玉県戸田市新曽2220-1 北戸田クリニック',
    '東京都豊島区西池袋1丁目10-10 4F 新線池袋クリニック',
    '東京都豊島区上池袋2丁目42-21 豊島中央病院',
    '東京都北区赤羽南2丁目10-13 赤羽中央病院附属クリニック',
    '東京都板橋区向原3丁目10-23 医療法人社団博鳳会敬愛病院',
    '東京都板橋区向原3丁目10-6 敬愛病院附属クリニック',
    '東京都練馬区田柄2丁目52-10 第10藤ビル4・5・6F 優人クリニック',
    '東京都練馬区高松5丁目11-26 光が丘MKビル7F 優人光が丘クリニック',
    '埼玉県朝霞市東弁財3丁目5-16 あさか台透析クリニック',
    '埼玉県志木市本町5丁目21-63 志木駅前クリニック',
    '東京都板橋区本町36-3 大和病院',
    '東京都練馬区光が丘2丁目5-1 練馬光が丘病院',
    '東京都北区赤羽台4丁目17-56 東京北医療センター',
    '埼玉県川口市栄町3丁目11-29 川口六間クリニック',
    '東京都板橋区徳丸3丁目11-2 東武練馬クリニック',
    '東京都練馬区高野台1丁目8-15 練馬高野台クリニック'
  ]);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(() => {
      const google = window.google;
      const mapInstance = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 35.6812, lng: 139.7671 },
        zoom: 12,
      });
      setMap(mapInstance);

      const autocompleteInstance = new google.maps.places.Autocomplete(originRef.current);
      setAutocomplete(autocompleteInstance);

      const hospitalAutocompleteInstance = new google.maps.places.Autocomplete(hospitalRef.current);
      setHospitalAutocomplete(hospitalAutocompleteInstance);
    });
  }, []);

  const calculateRoutes = async () => {
    if (!map || !originRef.current.value) return;

    const google = window.google;
    const origin = originRef.current.value;

    // ★マーカー削除（前回分）
    if (originMarker) {
      originMarker.setMap(null);
    }

    // 病院マーカーとルート線削除
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
    directionsRenderers.forEach(renderer => renderer.setMap(null));
    setDirectionsRenderers([]);

    // ★マーカー作成
    const newOriginMarker = new google.maps.Marker({
      map,
      position: null,
      label: '★',
    });
    setOriginMarker(newOriginMarker);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: origin }, (geoResults, geoStatus) => {
      if (geoStatus === 'OK') {
        newOriginMarker.setPosition(geoResults[0].geometry.location);
      }
    });

    const service = new google.maps.DistanceMatrixService();
    const destinations = hospitalInputs.map(input => input.split(' ')[0]);

    service.getDistanceMatrix({
      origins: [origin],
      destinations: destinations,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (response, status) => {
      if (status === 'OK') {
        const tempResults = response.rows[0].elements.map((element, index) => ({
          address: hospitalInputs[index],
          distance: element.distance ? element.distance.value : Infinity,
          duration: element.duration ? element.duration.value : Infinity,
          distanceText: element.distance ? element.distance.text : '取得失敗',
          durationText: element.duration ? element.duration.text : '取得失敗',
        })).sort((a, b) => a.distance - b.distance);

        setResults(tempResults);

        const newRenderers = [];

        tempResults.slice(0, 5).forEach((result, i) => {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: result.address.split(' ')[0] }, (geoResults, geoStatus) => {
            if (geoStatus === 'OK') {
              const marker = new google.maps.Marker({
                map,
                position: geoResults[0].geometry.location,
                label: `${i + 1}`,
              });
              setMarkers(prev => [...prev, marker]);

              const directionsService = new google.maps.DirectionsService();
              const directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                polylineOptions: {
                  strokeColor: i === 0 ? '#FF0000' : '#00AAFF',
                  strokeWeight: i === 0 ? 6 : 3,
                },
                suppressMarkers: true,
              });
              directionsService.route({
                origin,
                destination: geoResults[0].geometry.location,
                travelMode: google.maps.TravelMode.DRIVING,
              }, (directionsResult, directionsStatus) => {
                if (directionsStatus === 'OK') {
                  directionsRenderer.setDirections(directionsResult);
                }
              });
              newRenderers.push(directionsRenderer);
            }
          });
        });

        setDirectionsRenderers(newRenderers);
      }
    });
  };

  const sortedResults = [...results].sort((a, b) => a[sortKey] - b[sortKey]);

  const handleAddHospital = () => {
    if (hospitalRef.current && hospitalRef.current.value.trim()) {
      setHospitalInputs([...hospitalInputs, hospitalRef.current.value]);
      hospitalRef.current.value = '';
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>病院検索マップ</h1>
      <p>使い方：①患者の住所を入力 → ②地図を表示 → ③検索して比較ボタンを押す</p>

      <div style={{ marginBottom: 20 }}>
        <h3>検索対象の病院リスト</h3>
        <ul style={{ maxHeight: '200px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px' }}>
          {hospitalInputs.map((hospital, idx) => (
            <li key={idx}>{hospital}</li>
          ))}
        </ul>
      </div>

      <input ref={originRef} type="text" placeholder="患者の住所を入力" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
      <div>
        <button onClick={calculateRoutes} style={{ marginRight: 10, padding: '8px 16px', fontSize: '14px' }}>検索して比較</button>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
        <input
          ref={hospitalRef}
          type="text"
          placeholder="病院を追加（例: 東京都渋谷区○○病院）"
          style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
        />
        <button
          onClick={handleAddHospital}
          style={{ padding: '8px 16px', fontSize: '14px', width: 'auto', alignSelf: 'flex-start' }}
        >
          病院を追加
        </button>
      </div>

      <div id="map" style={{ height: '500px', marginTop: 20 }}></div>

      {results.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2>検索結果</h2>
          <div style={{ marginBottom: 10 }}>
            <button onClick={() => setSortKey('distance')} style={{ marginRight: 10 }}>距離順</button>
            <button onClick={() => setSortKey('duration')}>時間順</button>
          </div>
          <ul>
            {sortedResults.map((r, idx) => (
              <li key={idx} style={idx === 0 ? { fontWeight: 'bold', color: 'red' } : {}}>
                {idx + 1}. {r.address} - 距離: {r.distanceText} - 時間: {r.durationText}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
