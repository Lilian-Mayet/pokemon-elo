import requests

def search_pokemon_cards(query, page=1, page_size=2):
    url = "https://api.pokemontcg.io/v2/cards"
    params = {
        'q': query,
        'page': page,
        'pageSize': page_size,
        'select': 'id,name,supertype,rarity,types,artist,set.id,set.series,set.releaseDate'
    }
    headers = {
        'X-Api-Key': '8b98b607-08fb-4453-95b5-88dab15d8ed1'  # Si l'API nécessite une clé, remplace 'YOUR_API_KEY' par ta clé API
    }

    response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        data = response.json()
        cards = data.get('data', [])
        for card in cards:
            print(f"ID: {card.get('id')}")
            print(f"Name: {card.get('name')}")
            print(f"Supertype: {card.get('supertype')}")
            print(f"Rarity: {card.get('rarity')}")
            print(f"Types: {', '.join(card.get('types', []))}")
            print(f"Artist: {card.get('artist')}")
            set_info = card.get('set', {})
            print(f"Set ID: {set_info.get('id')}")
            print(f"Set Series: {set_info.get('series')}")
            print(f"Release Date: {set_info.get('releaseDate')}")
            print("-" * 40)
    else:
        print(f"Error: {response.status_code}")

# Exemple d'utilisation
search_pokemon_cards("name:turtwig")
