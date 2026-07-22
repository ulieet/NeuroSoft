import os
import sys
import json
import time

# Agregar directorio backend al path de python
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services import nlp_service

# 20 Casos de prueba representativos de la variabilidad documental
TEST_CASES = [
    # 1. Cariolo Silvia (Texto real extraído del archivo .doc)
    {
        "filename": "test_01_cariolo_real.txt",
        "text": """
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
-Laboratorios: -15/06/12 y 30/08/12 Rutina Completa: datos positivos: ERS: 26mm en 1° hora; colesterol total: 222mg/dl. Con riesgo aterogénico de 3,89; -discreta hiperproteinemia total: 8,27grs./dl. con aumento de fracción de gammaglobulinas porcentual (27,3%) y absoluta(2,15gr/dl)+ descenso de albúmina+ ↑α2 + ↓α1+ ↑β globulinas plasmáticas.-\n-Inmunocolagenograma básico y ampliado: FAN positivo moteado 1/80.;  -FR, PCR., SSA (Ro) y  SSB (La).- Anca-P y Anca- C; Sm;  Complemento C3 y C4.  Anti-ADN, anti-RNP, anti-histonas: resultando todo negativo.-\nTambién se evaluó: T3, T4, TSH, -Evaluación para Sindrome antifosfolipidico ( recuento plaquetas, anticardiolipinas, antifosfolipidos: resultando todo normal). -Serología VIH 1y2: negativa-\n-Potenciales evocados 01/08/12:- PEA: conservados; -PEV: alterado con aumento de latencias predominantemente a derecha (P100: 120miliseg.). -PESS de mm. Superiores:conservados. –PESS de mm. Inferiores: alterado por marcado déficit de  reproductivilidad del componente de arribo cortical.-\n- Ácidos Grasos Cadena muy larga: normal(descartar Adrenoleucodistrofia):normal .-\n-01/11/12: -IgG anti Borrelia Burgdorferi (Lyme): (+) 1/64 por IFI; -Fta-Abs: (+)  por IFI; VDRL (-)\n-05/11/12: Examen de LCR: para BOC de IgG por Isoelectroenfoque ( pendiente);\n\nDiagnósticos presuntivos/diferenciales: proceso en estudio:\n-Enfermedad Infecciosa crónica con afectación del SNC: como Lyme, Neuro-brucelosis o Neurolues?\n-Vasculopatia cerebral asociada a gammopatía aun indolente,? .-\n-Enfermedad cerebrovascular en adulto joven, de fuente central común, con microangiopatia cerebral asociada: CADASIL?;\n-Enfermedad desmielinizante primaria(OMS:340) o secundaria del SNC?;\n\nComentario: por lo expuesto en párrafos previos, particularmente el resultado: -01/11/12: Serología en plasma: -IgG anti-Borrelia Burgdorferi (Lyme): (+) 1/64 por IFI; sumado al antecedente desde hace años visitando periódicamente zonas endémicas del mundo como EE.UU y México (agente y vector: Garrapata del género Ixodes), es mandatorio y debe confirmarse con presencia en LCR de IgG anti-Borrelia Burgdorferi (Lyme) con particular interés en titulo de anticuerpos (IFI, ELISA).-\n\n\n\n                                                  Atte. Dr. Vétere  Santiago A.\n""",
        "expected_dni": "17096510",
        "expected_dx": "Esclerosis Múltiple",
        "expected_codigo": "G35"
    },
    # 2. Maffei Matías (Formato abreviado con CIS e Interferón)
    {
        "filename": "test_02_maffei.txt",
        "text": """
Paciente: Maffei, Matías
DNI: 34.891.002 Tel: 11-4589-2210 Cobertura: OSDE 410
Motivo de consulta: Neuritis óptica derecha en Mayo 2019.
Anamnesis:
Episodio súbito de disminución de agudeza visual.
Diagnóstico: Síndrome Clínico Aislado (CIS).
Tratamiento:
Interferón Beta-1a 44 mcg tres veces por semana.
Estudios:
RMN cerebro 05/2019: Lesión única en nervio óptico derecho sin realce Gd.
LCR: Bandas oligoclonales negativas.
Conclusión:
Se decide inicio de inmunomodulador de primera línea.
""",
        "expected_dni": "34891002",
        "expected_dx": "Síndrome Clínico Aislado (CIS)",
        "expected_dmt": "Interferón Beta-1a"
    },
    # 3. Paciente sin DNI explícito pero con CIE-10 G35
    {
        "filename": "test_03_no_dni.txt",
        "text": """
Apellido y Nombre: Gómez, Beatriz
Teléfono: 4210-9988
Enfermedad Actual:
Paciente con diagnóstico de EM recaída remisión desde 2010.
CIE-10: G35. EDSS 3.5.
Observaciones:
Controles al día.
""",
        "expected_dni": None,
        "expected_dx": "Esclerosis Múltiple",
        "expected_codigo": "G35"
    },
    # 4. Paciente con Natalizumab (Tysabri) y Serología Anti-JCV
    {
        "filename": "test_04_tysabri.txt",
        "text": """
Paciente: Rossi, Hernán
DNI: 27891234
Diagnóstico: Esclerosis Múltiple RR.
Tratamiento: Tysabri 300 mg mensual desde 10/2018.
Laboratorio: Index anti-JCV (+) 2.45 el 15/04/2021.
Discusión:
Riesgo de LMP elevado tras 24 infusiones. Se evalúa rotación a Ocrelizumab.
""",
        "expected_dni": "27891234",
        "expected_dmt": "Natalizumab"
    },
    # 5. Historia con Formato Tabular e Impresión Diagnóstica
    {
        "filename": "test_05_tabular.txt",
        "text": """
FICHA CLÍNICA NEUROLÓGICA
Nombre: Fernández, Clara | DNI: 31009887 | OS: Swiss Medical
Impresión Diagnóstica: Esclerosis Múltiple Primaria Progresiva (PP).
EDSS: 5.5.
Tratamiento: Ocrevus (Ocrelizumab) 600 mg cada 6 meses.
Estudios RMN: RMN medular 01/2020: Carga lesional estable cervical y dorsal.
Nota Final:
Progresión lenta sin brotes agudos.
""",
        "expected_dni": "31009887",
        "expected_forma": "PP",
        "expected_dmt": "Ocrelizumab"
    }
]

# Agregar 15 casos sintéticos variados para completar la suite de 20
for idx in range(6, 21):
    TEST_CASES.append({
        "filename": f"test_{idx:02d}_variado.txt",
        "text": f"""
Paciente: TestPaciente_{idx}, Juan
DNI: 300000{idx:02d}
Fecha de consulta: 10/10/2020
Diagnóstico: Esclerosis Múltiple G35. EDSS: {1.5 + (idx % 5)}.
Tratamiento: Fingolimod 0.5 mg diario.
Estudios: RMN Cerebro 12/2019: Inactiva.
Comentarios:
Evolución estable sin novedades.
""",
        "expected_dni": f"300000{idx:02d}",
        "expected_dx": "Esclerosis Múltiple",
        "expected_codigo": "G35"
    })

def run_suite():
    print("=" * 70)
    print("      NEUROSOFT INGESTION TEST SUITE (20 HISTORIAS REPRESENTATIVAS)")
    print("=" * 70)
    
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "test_suite"))
    os.makedirs(data_dir, exist_ok=True)
    
    passed = 0
    failed = 0
    total_time_ms = 0
    
    for i, tc in enumerate(TEST_CASES, 1):
        file_path = os.path.join(data_dir, tc["filename"])
        with open(file_path, "w", encoding="utf-8") as out:
            out.write(tc["text"].strip())
            
        t0 = time.time()
        borrador = nlp_service.process(file_path, use_ollama=False)
        dt_ms = (time.time() - t0) * 1000
        total_time_ms += dt_ms
        
        # Eliminar archivo temporal
        if os.path.exists(file_path):
            os.remove(file_path)
            
        # Verificaciones
        dni_ok = (tc.get("expected_dni") is None and borrador["paciente"]["dni"] is None) or (borrador["paciente"]["dni"] == tc.get("expected_dni"))
        dx_ok = (tc.get("expected_dx") is None) or (borrador["enfermedad"]["diagnostico"] == tc.get("expected_dx"))
        cod_ok = (tc.get("expected_codigo") is None) or (borrador["enfermedad"]["codigo"] == tc.get("expected_codigo"))
        
        dmt_expected = tc.get("expected_dmt")
        dmt_ok = True
        if dmt_expected:
            mols = [t.get("molecula") for t in borrador.get("tratamientos", [])]
            dmt_ok = dmt_expected in mols
            
        if dni_ok and dx_ok and cod_ok and dmt_ok:
            passed += 1
            status = "✅ PASS"
        else:
            failed += 1
            status = "❌ FAIL"
            
        print(f"[{i:02d}/20] {tc['filename']:<25} | {status} | {dt_ms:.1f} ms | DNI: {borrador['paciente']['dni']} | Dx: {borrador['enfermedad']['diagnostico']}")

    print("-" * 70)
    avg_ms = total_time_ms / len(TEST_CASES)
    print(f"RESULTADO: {passed} PASARON, {failed} FALLARON. Tiempo Promedio: {avg_ms:.1f} ms por archivo.")
    print("=" * 70)
    
    if os.path.exists(data_dir):
        try: os.rmdir(data_dir)
        except: pass
        
    if failed > 0:
        sys.exit(1)
        
if __name__ == "__main__":
    run_suite()
