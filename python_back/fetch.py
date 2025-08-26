from datetime import datetime
import requests
from sqlalchemy import create_engine,text
from sqlalchemy.orm import sessionmaker
from database import PokemonSet,PokemonCard
from psycopg2 import pool
from dotenv import load_dotenv
import os

load_dotenv()

# Utiliser la variable d'environnement pour la connexion
connection_string = os.getenv('DATABASE_URL')
connection_string = "postgresql://PokemonTCG_owner:m6dJwoH8KAMU@ep-quiet-glitter-a2shr253.eu-central-1.aws.neon.tech/PokemonTCG?sslmode=require"
engine = create_engine(connection_string)
Session = sessionmaker(bind=engine)
session = Session()


def fetch_pokemon_sets():




    url = "https://api.pokemontcg.io/v2/sets"
    params = {
        'orderBy': 'releaseDate',  # Tri croissant par date de sortie
        'select': 'id,name,series,releaseDate,images'
    }
    headers = {
        'X-Api-Key': '8b98b607-08fb-4453-95b5-88dab15d8ed1'  # Si l'API nécessite une clé, remplace 'YOUR_API_KEY' par ta clé API
    }

    response = requests.get(url, params=params,headers=headers)

    if response.status_code == 200:
        print("success")
        data = response.json()
        sets = data.get('data', [])

        for set_info in sets:
            set_id = set_info.get('id')
            name = set_info.get('name')
            series = set_info.get('series')
            release_date_str = set_info.get('releaseDate')
            release_date = datetime.strptime(release_date_str, "%Y/%m/%d").date() if release_date_str else None
            logo_image = set_info.get('images', {}).get('logo')

            # Vérifier si le set existe déjà
            existing_set = session.query(PokemonSet).filter_by(id=set_id).first()
            if not existing_set:
                # Créer un nouvel objet PokemonSet
                new_set = PokemonSet(id=set_id, name=name, series=series, release_date=release_date,
                                     logo_image=logo_image)
                session.add(new_set)
                print(f"Enregistrement du set: {name}")

        # Commit pour sauvegarder dans la base de données
        session.commit()
        print("Tous les sets ont été enregistrés dans la base de données.")
    else:
        print(f"Erreur lors de la récupération des sets : {response.status_code}")


def get_sets_from_db(session):
    sets = session.execute(text('SELECT id FROM pokemon_sets')).fetchall()
    return [set_row[0] for set_row in sets]
def fetch_cards_by_set():

    sets = get_sets_from_db(session)
    for set_id in sets:
        print(f"Récupération des cartes pour le set: {set_id}")
        url = f"https://api.pokemontcg.io/v2/cards"
        params = {
            'q': f'set.id:{set_id}',  # Filtrer les cartes par set ID
            'pageSize': 400,  # Limite de 250 cartes par page
        }

        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            cards = data.get('data', [])

            for card_info in cards:
                card_id = card_info.get('id')
                name = card_info.get('name')
                supertype = card_info.get('supertype')
                rarity = card_info.get('rarity')
                types = ", ".join(card_info.get('types', []))  # On transforme la liste en chaîne
                artist = card_info.get('artist')
                image_url_large = card_info.get('images', {}).get(
                    'large')  # Récupération de l'URL de l'image haute qualité

                # Vérifier si la carte existe déjà
                existing_card = session.query(PokemonCard).filter_by(id=card_id).first()
                if not existing_card:
                    # Créer un nouvel objet PokemonCard
                    new_card = PokemonCard(
                        id=card_id,
                        name=name,
                        supertype=supertype,
                        rarity=rarity,
                        types=types,
                        artist=artist,
                        image_url_large=image_url_large,
                        set_id=set_id
                    )
                    session.add(new_card)
                    print(f"Enregistrement de la carte: {name} avec l'image {image_url_large}")

            # Commit pour sauvegarder dans la base de données
            session.commit()
            print(f"Toutes les cartes du set {set_id} ont été enregistrées.")
        else:
            print(f"Erreur lors de la récupération des cartes pour le set {set_id}: {response.status_code}")


fetch_cards_by_set()