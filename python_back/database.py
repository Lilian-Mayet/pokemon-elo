from sqlalchemy import create_engine, Column, String, Date, ForeignKey,Numeric,Integer
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Utiliser la variable d'environnement pour la connexion
connection_string = os.getenv('DATABASE_URL')


engine = create_engine(connection_string)

Base = declarative_base()

# Définition de la table PokemonSet (doit correspondre à la table dans PostgreSQL)
class PokemonSet(Base):
    __tablename__ = 'pokemon_sets'

    id = Column(String, primary_key=True)       # L'ID du set
    name = Column(String)                       # Le nom du set
    series = Column(String)                     # La série du set
    release_date = Column(Date)                 # La date de sortie
    logo_image = Column(String)                 # URL du logo

class PokemonCard(Base):
    __tablename__ = 'pokemon_card'

    id = Column(String, primary_key=True)          # L'ID de la carte
    name = Column(String)                          # Le nom de la carte
    supertype = Column(String)                     # Le supertype (ex: Pokémon, Trainer)
    rarity = Column(String)                        # La rareté (ex: Rare, Holo)
    types = Column(String)                         # Les types (ex: Grass, Fire)
    artist = Column(String)                         #l'artiste
    image_url_large = Column(String)                #img url
    set_id = Column(String, ForeignKey('pokemon_sets.id'))  # L'ID du set, clé étrangère vers pokemon_sets

        # --- Colonnes pour ELO ---
    elo = Column(Numeric, nullable=False, server_default=text("1000"))
    games_played = Column(Integer, nullable=False, server_default=text("0"))
    wins = Column(Integer, nullable=False, server_default=text("0"))
    losses = Column(Integer, nullable=False, server_default=text("0"))





    
# Session pour interagir avec la base de données
#Session = sessionmaker(bind=engine)
#session = Session()
