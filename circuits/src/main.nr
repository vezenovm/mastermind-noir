use dep::std;

fn main(
    guessA: pub u32, 
    guessB: pub u32,
    guessC: pub u32,
    guessD: pub u32,
    numHit: pub u32,
    numBlow: pub u32,
    solnHash: pub Field,
    solnA: u32,
    solnB: u32,
    solnC: u32,
    solnD: u32,
    salt: u32
) {
    let mut guess = [guessA, guessB, guessC, guessD];
    let mut soln = [solnA, solnB, solnC, solnD];

    for i in 0..4 {
        let mut invalidInputFlag = 1;
        if (guess[i] > 9) | (guess[i] == 0) {
            invalidInputFlag = 0;
        }
        if (soln[i] > 9) | (soln[i] == 0) {
            invalidInputFlag = 0;
        } 
        constrain invalidInputFlag == 1;
        for j in (i+1)..4 { // Check that the guess and solution digits are unique
            constrain guess[i] != guess[j];
            constrain soln[i] != soln[j];
        };
    };

    let mut hit: u32 = 0;
    let mut blow: u32 = 0;

    for i in 0..4 {
        for j in 0..4 {
            let mut isEqual: u32 = 0;
            if (guess[i] == soln[j]) {
                isEqual = 1;
                blow = blow + 1;
            }
            if (i == j) {
                hit = hit + isEqual;
                blow = blow - isEqual;
            }
        };
    };

    constrain numBlow == blow;

    constrain hit == numHit;

    let privSolnHash = std::hash::pedersen([salt as Field, solnA as Field, solnB as Field, solnC as Field, solnD as Field]);

    constrain solnHash == privSolnHash[0];
}
    