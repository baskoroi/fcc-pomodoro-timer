{
    'use strict';

    const colors = {
        green: '#AADB18',
        red: '#E74C3C',
    };

    /**
     * Selected elements from the application
     * 
     * @type {Object}
     */
    let elements = {
        timer: {
            button: document.getElementsByClassName('timer')[0],
            pie: document.getElementsByClassName('pie'), // an array
            time: {
                mmss: document.getElementsByClassName('mmss')[0],
                status: document.getElementsByClassName('status')[0],
            },
            spinner: document.getElementsByClassName('spinner')[0],
            filler: document.getElementsByClassName('filler')[0],
            mask: document.getElementsByClassName('mask')[0],
        },
        work: {
            minus: document.querySelector('.work .minus'),
            plus: document.querySelector('.work .plus'),
            minutes: document.querySelector('.work input[type="text"]'),
        },
        rest: {
            minus: document.querySelector('.rest .minus'),
            plus: document.querySelector('.rest .plus'),
            minutes: document.querySelector('.rest input[type="text"]'),
        },
        alarm: {
            select: document.getElementsByName('alarm')[0],
            options: document.querySelectorAll('.alarm option'),
            preview: {
                button: document.getElementsByClassName('preview-alarm')[0],
            },
        },
    };

    /**
     * Current values needed in the application (used in other components)
     * e.g. number of minutes per work/rest, whether the timer is running, etc.
     * 
     * @type {Object}
     */
    let status = {
        // start of timer
        isStart: true,
        
        // true: work, false: rest
        isWorking: true,

        // true: 'stop' on timer, false: 'start' on timer
        isCounting: false,

        // current time (default: set to # minutes of work)
        currentTime: new Date(25 * 60 * 1000),

        // number of minutes per work session
        work: 25,

        // number of minutes per rest session
        rest: 5,

        // the selected alarm tone
        alarm: elements.alarm.select.value,
    };

    /**
     * Interval ID for the running timer
     */
    let intervalId;

    /**
     * Remaining milliseconds from the timer to 0 (when paused)
     */
    let remainingMs = 0;

    /**
     * Stores the alamr tones and handles their playback
     * @type {Object}
     */
    let alarm = {
        _tones: {
            'rooster': new Audio('http://res.cloudinary.com/baskoroi/video/upload/v1471192217/rooster_x4ck0b.mp3'),
            'foghorn': new Audio('http://res.cloudinary.com/baskoroi/video/upload/v1471192218/foghorn_mrh2d1.mp3'),
            'japanese-bell': new Audio('http://res.cloudinary.com/baskoroi/video/upload/v1471192217/japanese-bell_k7lfki.mp3'),
            'woop-woop': new Audio('http://res.cloudinary.com/baskoroi/video/upload/v1471192217/woop-woop_t6nkdr.mp3'),
        },
        play() {
            this._tones[status.alarm].play();
        },
    };

    /**
     * Functionalities used in the Pomodoro timer
     * e.g. get current time, decrement it, etc.
     * 
     * @type {Object}
     */
    let control = {
        currentTime: {
            toString: () => status.currentTime.toString().slice(19, 24),
            get: () => status.currentTime,
            set: (mins, secs) => { 
                status.currentTime.setMinutes(mins, secs); 
            },
            setWithMs: (mins, secs, ms) => {
                status.currentTime.setMinutes(mins, secs, ms);
            },
            decrement: () => {
                let prev = status.currentTime;
                status.currentTime.setTime(prev - 1000);
            },
            decrementWithMs: (ms) => {
                let prev = status.currentTime;
                status.currentTime.setTime(prev - ms);
            },
            isZero: () => status.currentTime - new Date(0) === 0,
        },
    };

    /**
     * Controls aniamtion of the Pomodoro timer
     * 
     * @type {Object}
     */
    let animation = {
        timer: {
            // to fill the entire pie of the timer
            full: () => {
                // make references to the timer's elements
                let spinner = elements.timer.spinner;
                let filler = elements.timer.filler;
                let mask = elements.timer.mask;

                // initialize the animation property for the elements
                spinner.style.animationName = 'rota';
                spinner.style.animationTimingFunction = 'linear';
                spinner.style.animationIterationCount = 'infinite';
                spinner.style.animationPlayState = 'paused';

                spinner.style.webkitAnimationName = 'rota';
                spinner.style.webkitAnimationTimingFunction = 'linear';
                spinner.style.webkitAnimationIterationCount = 'infinite';
                spinner.style.webkitAnimationPlayState = 'paused';

                filler.style.animationName = 'fill';
                filler.style.animationTimingFunction = 'steps(1, end)';
                filler.style.animationIterationCount = 'infinite';
                filler.style.animationPlayState = 'paused';

                filler.style.webkitAnimationName = 'fill';
                filler.style.webkitAnimationTimingFunction = 'steps(1, end)';
                filler.style.webkitAnimationIterationCount = 'infinite';
                filler.style.webkitAnimationPlayState = 'paused';

                mask.style.animationName = 'mask';
                mask.style.animationTimingFunction = 'steps(1, end)';
                mask.style.animationIterationCount = 'infinite';
                mask.style.animationPlayState = 'paused';

                mask.style.webkitAnimationName = 'mask';
                mask.style.webkitAnimationTimingFunction = 'steps(1, end)';
                mask.style.webkitAnimationIterationCount = 'infinite';
                mask.style.webkitAnimationPlayState = 'paused';
            },

            // to start a work/rest session (to start, couple with .play())
            start: () => {
                // make references to the timer's elements
                let spinner = elements.timer.spinner;
                let filler = elements.timer.filler;
                let mask = elements.timer.mask;

                // set the duration for the CSS3 animations
                // 
                // Animation names: 
                // (spinner: rota, filler: fill, mask: mask)
                let minutes = (status.isWorking) ? status.work : status.rest;
                let duration = minutes * 60 + 1; // because including 00:00 while counting

                console.log('minutes = ', minutes);
                console.log('duration = ', duration);

                control.currentTime.set(minutes, 0);
                updateTimeDisplay(false);

                spinner.style.animationDuration = duration.toString() + 's';
                filler.style.animationDuration = duration.toString() + 's';
                mask.style.animationDuration = duration.toString() + 's';

                spinner.style.webkitAnimationDuration = duration.toString() + 's';
                filler.style.webkitAnimationDuration = duration.toString() + 's';
                mask.style.webkitAnimationDuration = duration.toString() + 's';
            },

            // to play/resume the current session
            play: () => {
                let spinner = elements.timer.spinner;
                let filler = elements.timer.filler;
                let mask = elements.timer.mask;

                spinner.style.animationPlayState = 'running';
                filler.style.animationPlayState = 'running';
                mask.style.animationPlayState = 'running';

                spinner.style.webkitAnimationPlayState = 'running';
                filler.style.webkitAnimationPlayState = 'running';
                mask.style.webkitAnimationPlayState = 'running';
            },

            // to pause the current session
            pause: () => {
                let spinner = elements.timer.spinner;
                let filler = elements.timer.filler;
                let mask = elements.timer.mask;

                spinner.style.animationPlayState = 'paused';
                filler.style.animationPlayState = 'paused';
                mask.style.animationPlayState = 'paused';

                spinner.style.webkitAnimationPlayState = 'paused';
                filler.style.webkitAnimationPlayState = 'paused';
                mask.style.webkitAnimationPlayState = 'paused';
            },
        },
    };

    /**
     * Updates the time display shown in timer
     * 
     * @param  {Boolean} doesDecrement whether timer is decrementing per second
     */
    function updateTimeDisplay(doesDecrement) {
        if (doesDecrement) {
            // just switch session (work/rest) + play alarm if currentTime === 0
            if (control.currentTime.isZero()) {
                status.isWorking = !status.isWorking;
                for (let i = 0; i < elements.timer.pie.length; i++) {
                    elements.timer.pie[i].style.backgroundColor = (status.isWorking) ? colors.green : colors.red;
                }
                control.currentTime.set(
                    (status.isWorking) ? status.work : status.rest, 0
                );

                status.isStart = !status.isStart;
                if (status.isStart) {
                    animation.timer.start();
                }

                alarm.play();
            }
            // otherwise, just decrement the timer
            else {
                control.currentTime.decrement();
            }
        }

        elements.timer.time.mmss.innerHTML = control.currentTime.toString();
        console.log('updateTimeDisplay(): control.currentTime.get() = ' + control.currentTime.get());

    }

    /**
     * Initialization of the above values into the elements
     */
    {
        elements.work.minutes.value = status.work;
        elements.rest.minutes.value = status.rest;

        // to initialize the time display with the default value
        updateTimeDisplay(false);

        elements.alarm.select.onchange = (event) => {
            status.alarm = elements.alarm.select.value;
        };
        elements.alarm.preview.button.onclick = (event) => {
            alarm.play();
        };

        elements.work.minus.onclick = (event) => {
            elements.work.minutes.value = 
                (status.isCounting || status.work === 1) ? 
                    status.work : --status.work;
            if (status.isWorking) {
                control.currentTime.set(status.work, 0);
                updateTimeDisplay(false);
            }
        };

        elements.work.plus.onclick = (event) => {
            elements.work.minutes.value = 
                (status.isCounting || status.work === 100) ? 
                    status.work : ++status.work;
            if (status.isWorking) {
                control.currentTime.set(status.work, 0);
                updateTimeDisplay(false);
            }
        };

        elements.rest.minus.onclick = (event) => {
            elements.rest.minutes.value = 
                (status.isCounting || status.rest === 1) ? 
                    status.rest : --status.rest;
            if (!status.isWorking) {
                control.currentTime.set(status.rest, 0);
                updateTimeDisplay(false);
            }
        };

        elements.rest.plus.onclick = (event) => {
            elements.rest.minutes.value = 
                (status.isCounting || status.rest === 100) ?
                    status.rest : ++status.rest;
            if (!status.isWorking) {
                control.currentTime.set(status.rest, 0);
                updateTimeDisplay(false);
            }
        };

        animation.timer.full();

        elements.timer.button.addEventListener('click', (event) => {
            status.isCounting = !status.isCounting;
            console.log('status.isCounting = ', status.isCounting);

            if (status.isCounting) {
                if (status.isStart) {
                    animation.timer.start();
                    status.isStart = !status.isStart;
                }
                animation.timer.play();

                // use remaining ms to decrement timer,
                // used to prevent timing inaccuracy, in which the CSS3 animation
                // doesn't reflect the remaining time, or v.v.
                console.log('remainingMs = ', remainingMs);
                if (remainingMs > 0) {
                    window.setTimeout(() => {
                        control.currentTime.decrementWithMs(remainingMs);
                    }, remainingMs);
                }
                remainingMs = 0;
                intervalId = window.setInterval(updateTimeDisplay, 1000, true);
            } else {
                if (!!intervalId) {
                    window.clearInterval(intervalId);
                }
                
                remainingMs = status.currentTime.getMilliseconds();
                console.log('remainingMs = ', remainingMs);
                animation.timer.pause();
            }
        });
    }

}