//! Below its closed range the velum lifts: the shut soft palate rises and arches, as in a yawn,
//! and the tract under it widens. Nothing in the range speech uses (-0.25 and up) changes.
use chimera::airway::frequency::{find_peaks, transfer_function};
use chimera::anatomy::human::{BODY_MALE, BodyName, HumanFrame, HumanVocalTract, NEUTRAL, VELUM_LIFT_MIN, velum_lift};
use chimera::phonetics::planner::vowel_table;
use chimera::voice::human_airway::HumanAirway;

fn areas(velum: f64, vowel: &str) -> Vec<f64> {
    let mut tract = HumanVocalTract::new(BODY_MALE);
    let mut frame = HumanFrame::default();
    let (mut ph, mut or) = (vec![0.0; 20], vec![0.0; 24]);
    let mut a = vowel_table()["male"][vowel].artic.apply_to(&NEUTRAL);
    a.velum = velum;
    tract.compute(&a, &mut frame);
    tract.resample(&a, &frame, &mut ph, &mut or, None, None);
    assert_eq!(frame.velum_port, 0.0, "a lifted velum stays shut");
    ph.into_iter().chain(or).collect()
}

fn formants(velum: f64, vowel: &str) -> Vec<f64> {
    let mut air = HumanAirway::new(96000.0, BodyName::Male.body());
    let freqs: Vec<f64> = (0..800).map(|i| 50.0 + 10.0 * i as f64).collect();
    let mut a = vowel_table()["male"][vowel].artic.apply_to(&NEUTRAL);
    a.velum = velum;
    air.apply(&a, 0.0);
    let tf = transfer_function(&air.net.linear_elements(), air.pharynx.first_node(), &freqs, &[air.glottis_port]);
    find_peaks(&freqs, &tf.mag, 150.0).iter().take(4).map(|p| p.freq).collect()
}

#[test]
fn the_closed_range_is_untouched() {
    assert_eq!(velum_lift(NEUTRAL.velum), 0.0);
    assert_eq!(velum_lift(-0.25), 0.0);
    assert_eq!(velum_lift(VELUM_LIFT_MIN), 1.0);
    for v in ["a", "i", "u"] {
        assert_eq!(areas(NEUTRAL.velum, v), areas(-0.25, v), "/{v}/");
    }
}

#[test]
fn lifting_the_velum_widens_the_tract_under_it() {
    for v in ["a", "e", "i", "o", "u"] {
        let (rest, up) = (areas(NEUTRAL.velum, v), areas(VELUM_LIFT_MIN, v));
        let gain: f64 = rest.iter().zip(&up).map(|(r, u)| u - r).sum();
        let worst = rest.iter().zip(&up).map(|(r, u)| u - r).fold(f64::INFINITY, f64::min);
        println!("/{v}/: area gained {gain:.2} cm² over the sections, worst section {worst:+.3}; formants {:?} → {:?}", formants(NEUTRAL.velum, v), formants(VELUM_LIFT_MIN, v));
        assert!(gain > 0.3, "/{v}/: the tract gained {gain:.2} cm²");
        // the tract grows a little longer under the arch, so the sections ahead slide along it
        assert!(worst > -0.3, "/{v}/: a section narrowed by {worst:.3} cm²");
    }
}

#[test]
fn the_lift_is_smooth() {
    // no section jumps as the velum rises: 200 steps, each far below an audible tick
    for v in ["a", "i", "u"] {
        let mut prev = areas(-0.25, v);
        for i in 1..=200 {
            let cur = areas(-0.25 - i as f64 / 200.0, v);
            let step = prev.iter().zip(&cur).map(|(p, c)| (p - c).abs()).fold(0.0, f64::max);
            assert!(step < 0.03, "/{v}/ at step {i}: a section moved {step:.3} cm²");
            prev = cur;
        }
    }
}
