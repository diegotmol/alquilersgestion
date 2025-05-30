from flask import Blueprint, request, jsonify
from src.models.inquilino import Inquilino, db

inquilinos_bp = Blueprint('inquilinos', __name__)

@inquilinos_bp.route('/', methods=['GET'])
def get_inquilinos():
    inquilinos = Inquilino.query.all()
    return jsonify([inquilino.to_dict() for inquilino in inquilinos])

@inquilinos_bp.route('/<int:id>', methods=['GET'])
def get_inquilino(id):
    inquilino = Inquilino.query.get_or_404(id)
    return jsonify(inquilino.to_dict())

@inquilinos_bp.route('/', methods=['POST'])
def create_inquilino():
    data = request.json
    
    nuevo_inquilino = Inquilino(
        propietario=data['propietario'],
        propiedad=data['propiedad'],
        telefono=data['telefono'],
        monto=data['monto']
    )
    
    db.session.add(nuevo_inquilino)
    db.session.commit()
    
    return jsonify(nuevo_inquilino.to_dict()), 201

@inquilinos_bp.route('/<int:id>', methods=['PUT'])
def update_inquilino(id):
    inquilino = Inquilino.query.get_or_404(id)
    data = request.json
    
    inquilino.propietario = data.get('propietario', inquilino.propietario)
    inquilino.propiedad = data.get('propiedad', inquilino.propiedad)
    inquilino.telefono = data.get('telefono', inquilino.telefono)
    inquilino.monto = data.get('monto', inquilino.monto)
    
    db.session.commit()
    
    return jsonify(inquilino.to_dict())

@inquilinos_bp.route('/<int:id>', methods=['DELETE'])
def delete_inquilino(id):
    inquilino = Inquilino.query.get_or_404(id)
    
    db.session.delete(inquilino)
    db.session.commit()
    
    return jsonify({"message": "Inquilino eliminado correctamente"}), 200
