import { useEffect, useRef } from 'react';

declare const google: any;

interface Props {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelected: (place: {
    address: string;
    formatted_address: string;
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    colony?: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

// El campo funciona como texto normal si Maps no está configurado; cuando el
// script público está disponible, añade autocompletado sin bloquear checkout.
export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Buscar dirección...',
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!inputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'mx' },
      fields: ['formatted_address', 'geometry', 'address_components', 'name'],
      types: ['establishment', 'geocode'],
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      let city = '';
      let state = '';
      let colony = '';
      place.address_components?.forEach((component: any) => {
        if (component.types.includes('locality')) city = component.long_name;
        if (component.types.includes('administrative_area_level_1')) state = component.long_name;
        if (component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) colony = component.long_name;
      });
      const formatted = place.formatted_address || place.name || '';
      onPlaceSelected({
        address: place.name || formatted,
        formatted_address: formatted,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        city,
        state,
        colony,
      });
      onChange(formatted);
    });
    autocompleteRef.current = autocomplete;
    return () => google.maps.event.clearInstanceListeners(autocomplete);
  }, [onChange, onPlaceSelected]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
