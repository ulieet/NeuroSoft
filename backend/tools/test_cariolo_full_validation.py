import os
import sys
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services import nlp_service

CARIOLO_REAL_DOC = """
                                                                                                                        URGENTE
 RESUMEN DE HISTORIA CLÍNICA                                                     La Plata, 15 de Noviembre de 2012.

Apellido y nombre: Cariolo, Silvia Verónica.         DNI: 17.096.510   Fecha de Nacimiento: 07/09/64
Dirección: Alvarado n° 1476 Florencio Varela      Teléfono: (011) 425-50462/  15-54526741
Obra Social: OSDE (410)	                            Nº de afiliado: 61081248202

Asistida: desde 07/08/12


Antecedentes personales: según refiere: -año 2009: TEC con conmoción cerebral.- -año 2010. Sinovitis de tobillo izquierdo(cirugía).- Otros: -distiroidismo (1°hiper ahora hipotiroidismo) por el que recibe T4: 75 Microgrs./día.
 -Diabetes/intolerancia glucosa, por la que recibió metformina, hoy ya no la requiere.-

Antecedentes familiares, destacables: madre con síndrome de ojo seco y necesidad de lágrimas artificiales.-

Síntomas principales: crisis de vértigos y mareos que se adjudicó a problemas cevicales por los que inclusive fue tratada con collar de Philadelphia;  cierta torpeza motora manual y en la  marcha; inversión de letras en la escritura  y   en figura o rostros familiares (parafasias literales, simultagnosias/prosopagnosias?); parestesias, hipoestesias y mayor torpeza sobre miembros a izquierda;episódica urgencia e incontinencia urinaria a gotas; sensación de ardor en los ojos; gran cansancio y fatiga creciente e injustificada.-

Estudios realizados: - 04/07/12: EEG: informado como Normal..-
-RMN de C. Cervical y Cerebro 03/07/12: -C.Cervical con médula espinal: normal; -Cerebro: múltiples imágenes focales periventriculares, principalmente bioccipitales y centros ovales frontales.-
-RMN de Cerebro 12/07/12: múltiples imágenes focales de la sustancia blanca bilaterales a predominio subcorticales bifronto-parietales, en coronas radiatas, centros semiovales y especialmente más grandes o coalescentes en zona de tapetum y bioccipital. Respeto o indemnidad del cuerpo calloso, sin efecto de masa, sin volcado del Gd.IV, ni imágenes infratentoriales. Por técnicas de Difusión y Espectroscopia y Transferencia de magnetización, más compatibles con áreas de gliosis y desmielinización microangiopática.-
-Angio-RMN de cerebro 28/08/12: no se reconocen alteraciones vasculo-cerebrales.-
-Ecocardiograma TT Completo 14/08/12: que permita descartar fuente embolígena: informado como normal.-
-Laboratorios: -15/06/12 y 30/08/12 Rutina Completa: datos positivos: ERS: 26mm en 1° hora; colesterol total: 222mg/dl. Con riesgo aterogénico de 3,89; -discreta hiperproteinemia total: 8,27grs./dl. con aumento de fracción de gammaglobulinas porcentual (27,3%) y absoluta(2,15gr/dl)+ descenso de albúmina+ ↑α2 + ↓α1+ ↑β globulinas plasmáticas.-
-Inmunocolagenograma básico y ampliado: FAN positivo moteado 1/80.;  -FR, PCR., SSA (Ro) y  SSB (La).- Anca-P y Anca- C; Sm;  Complemento C3 y C4.  Anti-ADN, anti-RNP, anti-histonas: resultando todo negativo.-
También se evaluó: T3, T4, TSH, -Evaluación para Sindrome antifosfolipidico ( recuento plaquetas, anticardiolipinas, antifosfolipidos: resultando todo normal). -Serología VIH 1y2: negativa-
-Potenciales evocados 01/08/12:- PEA: conservados; -PEV: alterado con aumento de latencias predominantemente a derecha (P100: 120miliseg.). -PESS de mm. Superiores:conservados. –PESS de mm. Inferiores: alterado por marcado déficit de  reproductivilidad del componente de arribo cortical.-
- Ácidos Grasos Cadena muy larga: normal(descartar Adrenoleucodistrofia):normal .-
-01/11/12: -IgG anti Borrelia Burgdorferi (Lyme): (+) 1/64 por IFI; -Fta-Abs: (+)  por IFI; VDRL (-)
-05/11/12: Examen de LCR: para BOC de IgG por Isoelectroenfoque ( pendiente);

Diagnósticos presuntivos/diferenciales: proceso en estudio:
-Enfermedad Infecciosa crónica con afectación del SNC: como Lyme, Neuro-brucelosis o Neurolues?
-Vasculopatia cerebral asociada a gammopatía aun indolente,? .-
-Enfermedad cerebrovascular en adulto joven, de fuente central común, con microangiopatia cerebral asociada: CADASIL?;
-Enfermedad desmielinizante primaria(OMS:340) o secundaria del SNC?;

Comentario: por lo expuesto en párrafos previos, particularmente el resultado: -01/11/12: Serología en plasma: -IgG anti-Borrelia Burgdorferi (Lyme): (+) 1/64 por IFI; sumado al antecedente desde hace años visitando periódicamente zonas endémicas del mundo como EE.UU y México (agente y vector: Garrapata del género Ixodes), es mandatorio y debe confirmarse con presencia en LCR de IgG anti-Borrelia Burgdorferi (Lyme) con particular interés en titulo de anticuerpos (IFI, ELISA).-



                                                  Atte. Dr. Vétere  Santiago A.
"""

def main():
    test_file = os.path.abspath("./data/test_cariolo_validation.txt")
    os.makedirs(os.path.dirname(test_file), exist_ok=True)
    
    with open(test_file, "w", encoding="utf-8") as out:
        out.write(CARIOLO_REAL_DOC.strip())
        
    t0 = time.time()
    borrador = nlp_service.process(test_file, use_ollama=False)
    elapsed_ms = (time.time() - t0) * 1000
    
    if os.path.exists(test_file):
        os.remove(test_file)
        
    print("=" * 80)
    print(f"      NEUROSOFT - VALIDACIÓN COMPLETA CARIOLO SILVIA ({elapsed_ms:.2f} ms)")
    print("=" * 80)
    
    print("\n1. DATOS ADMINISTRATIVOS:")
    print(json.dumps(borrador["paciente"], indent=2, ensure_ascii=False))
    
    print("\n2. DIAGNÓSTICO E INFERENCIA:")
    print(json.dumps(borrador["enfermedad"], indent=2, ensure_ascii=False))
    
    print("\n3. SECCIONES NARRATIVAS:")
    print(json.dumps(borrador["secciones_texto"], indent=2, ensure_ascii=False))
    
    print("\n4. ESTUDIOS COMPLEMENTARIOS ESTRUCTURADOS:")
    print(json.dumps(borrador["complementarios"], indent=2, ensure_ascii=False))
    
    print("\n5. TRATAMIENTOS ESTRUCTURADOS:")
    print(json.dumps(borrador["tratamientos"], indent=2, ensure_ascii=False))
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    main()
