import React, { Component, Fragment } from 'react';
import './main.css';

import { gql } from 'apollo-boost';
import { connect } from 'react-redux';
import FlipMove from 'react-flip-move';

import client from '../../apollo';
import links from '../../links';

import LoadIcon from '../__forall__/load.icon';

class Header extends Component {
    constructor(props) {
        super(props);

        this.state = {
            timeMachine: []
        }

        this.timeMachineRef = React.createRef();
        this.timeMachineRefScrolled = false;
    }

    componentDidMount() {
        this.generateTimeMachine();        
    }

    componentDidUpdate() {
        if(!this.timeMachineRefScrolled && this.state.timeMachine.length) {
            this.timeMachineRefScrolled = true;
            this.timeMachineRef.scrollLeft = this.timeMachineRef.scrollWidth;
        }
    }

    generateTimeMachine = () => {
        let a = [],
            b = +new Date();
        
        for(let ma = 0; ma < 30; ma++) {
            const c = b - 86400000 * ma,
                  d = new Date(c);

            a.push({
                index: ma,
                time: b - 86400000 * ma,
                isToday: ma === 0,
                title: `${ d.getDate() }${[
                    'jan',
                    'feb',
                    'mar',
                    'apr',
                    'may',
                    'june',
                    'july',
                    'aug',
                    'Ssep',
                    'oct',
                    'nov',
                    'dec'
                ][ d.getMonth() ]} ${ d.getFullYear() }`
            });
        }

        this.setState(() => ({
            timeMachine: a.reverse()
        }));
    }

    getCSSProgress = () => {
        const a = this.props.caloriesData;
        if(!a) return '0%';
        else
            return 100 / (a.maxCalories / a.currCalories) + '%';
    }

    render() {
        return(
            <header className="rn-foodstats-header">
                {/* icon */}
                <div className="rn-foodstats-header-icon">
                    <i className="fas fa-hamburger" />
                </div>
                {/* user name */}
                <h3 className="rn-foodstats-header-name">Oles Odynets</h3>
                {/* progress */}
                <div className="rn-foodstats-header-progress">
                    <div
                        className="rn-foodstats-header-progress-mat"
                        style={{
                            width: this.getCSSProgress()
                        }}
                    />
                    <div className="rn-foodstats-header-progress-particle a" />
                    <div className="rn-foodstats-header-progress-particle b" />
                    <div className="rn-foodstats-header-progress-particle c" />
                    <div className="rn-foodstats-header-progress-particle d" />
                    <div className="rn-foodstats-header-progress-particle e" />
                    <div className="rn-foodstats-header-progress-particle f" />
                    {/* particles:> */}
                </div>
                {/* calories left - small dark */}
                <span className="rn-foodstats-header-caloriesleft">
                    {
                        (this.props.caloriesData) ? (
                            this.props.caloriesData.maxCalories -
                            this.props.caloriesData.currCalories
                        ) : 0
                    } calories left
                </span>
                {/* record button */}
                <button className="rn-foodstats-header-newmeal definp" onClick={ this.props.onRecord }>Record meal</button>
                {/* days slider explorer :: center line */}
                <div className="rn-foodstats-header-explorer">
                    <div className={ (this.props.workOS !== "MAC") ? "" : "noscrbar" } ref={ ref => this.timeMachineRef = ref }>
                        {
                            this.state.timeMachine.map(({ index, title, time, isToday }) => (
                               <button
                                className={ `definp${ (this.props.currentListDay === time || (this.props.currentListDay === null && isToday)) ? " active" : "" }` }
                                key={ index }
                                onClick={ () => this.props.onChooseTime(time) }>
                                    { title }
                                </button> 
                            ))
                        }
                    </div>
                </div>
            </header>
        );
    }
}

class MealsListItem extends Component {
    convertTime(time) {
        const a = new Date(+time);

        return a.getHours() + ":" + a.getMinutes();
    }
    
    render() {
        return(
            <div className="rn-foodstats-meallist-item_container">
                <div className="rn-foodstats-meallist-item">
                    <div className="rn-foodstats-meallist-item-info">
                        <span className="rn-foodstats-meallist-item-title">{ this.props.name }</span>
                        <div className="rn-foodstats-meallist-item-dishes">
                            {
                                this.props.dishes.map((session, index) => (
                                    <span key={ index }>{ session }</span>
                                ))
                            }
                        </div>
                        <div className="rn-foodstats-meallist-item-infomat">
                            <span>{ this.convertTime(this.props.time) } AM</span>
                            <span>•</span>
                            <span>{ this.props.calories } calories</span>
                        </div>
                    </div>
                    <div className="rn-foodstats-meallist-item-controls">
                        <button
                            className="rn-foodstats-meallist-controls-item definp"
                            onClick={ this.props.onDelete }>
                            <i className="fas fa-trash" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

class MealsList extends Component {
    render() {
        return(
            <section className="rn-foodstats-meallist">
                {
                    (!this.props.addingItem) ? null : (
                        <LoadIcon />
                    )
                }
                <FlipMove
                    className="rn-foodstats-meallist-mat"
                    enterAnimation="elevator"
                    leaveAnimation="elevator">
                    {
                        this.props.list.map(({ id, name, dishes, time, calories }) => (
                            <MealsListItem
                                key={ id }
                                name={ name }
                                dishes={ dishes }
                                time={ time }
                                calories={ calories }
                                onDelete={ () => this.props.onDeleteMeal(id) }
                            />
                        ))
                    }
                </FlipMove>
            </section>
        );
    }
}

// WARNING: DO NOT USE FUNCTION OR OBJECT INSTEAD OF CLASS HERE. --react-flip-move
class RecorderNameTag extends Component {
    render() {
        return(
            <button className="definp rn-foodstats-recorder-foodtags-item" onClick={ this.props._onDelete }>
                <span>{ this.props.name }</span>
                <div>x</div>
            </button>
        );
    }
}

class RecorderNameInput extends Component {
    constructor(props) {
        super(props);

        this.state = {
            value: ""
        }

        this.matRef = React.createRef();
    }

    submit = () => {
        this.matRef.value = "";
        this.setState(() => ({
            value: ""
        }));

        if(this.state.value.replace(/\s|\n/g, "").length) {
            this.props._onSubmit(this.state.value);
        }
    }

    render() {
        return(
            <input
                className="rn-foodstats-recorder-input definp"
                placeholder={ this.props._placeholder }
                type="text"
                onKeyDown={(e) => {
                    if([13, 188].includes(e.keyCode)) {
                        e.preventDefault();
                        this.submit();
                    }
                }}
                onChange={ ({ target: { value } }) => this.setState({ value }) }
                onBlur={ this.submit }
                ref={ ref => this.matRef = ref }
            />
        );
    }
}

class RecorderCaloriesSlider extends Component {
    constructor(props) {
        super(props);

        this.state = {
            clientX: 0,
            sliding: false
        }

        this.sliderRef = React.createRef();
        this.cursorRef = React.createRef();
    }

    componentDidUpdate(a) {
        if(a.calories && !this.props.calories) {
            this.setState(() => ({
                sliding: false,
                clientX: 0
            }));
        }
    }

    render() {
        return(
            <div className="rn-foodstats-recorder-caloriesslider"
                ref={ ref => this.sliderRef = ref }
                onMouseMove={({ clientX }) => {
                    if(!this.state.sliding) return;

                    const a = this.sliderRef.getBoundingClientRect(),
                          b = this.cursorRef.getBoundingClientRect().width,
                          c = (
                            clientX - a.left -
                            this.cursorRef.getBoundingClientRect().width / 2
                        );

                    if(c < 0 || clientX + b / 2 > a.left + a.width) return;

                    // get calories in % (according to the slider width)
                    const d = 100 / ((a.width - b) / c);
                    
                    const maxCalories = 1500;

                    // convert to the calories number (according to the max calories number and calories in %)
                    const e = Math.round(maxCalories / 100 * d);

                    this.setState(() => ({
                        clientX: c
                    }), () => this.props._onChange(e));
                }}
                onMouseUp={ () => this.setState({ sliding: false }) }>
                <div className="rn-foodstats-recorder-caloriesslider-cursor"
                    onMouseDown={ () => this.setState({ sliding: true }) }
                    ref={ ref => this.cursorRef =  ref }
                    style={{
                        transform: `translateX(${ this.state.clientX }px)`
                    }}>
                    <div className="rn-foodstats-recorder-caloriesslider-cursor-counter">
                        <span>{ this.props.calories } calories</span>
                    </div>
                </div>
            </div>
        );
    }
}

class Recorder extends Component {
    constructor(props) {
        super(props);

        this.state = {
            food: [],
            foodID: 0,
            calories: 0
        }
    }

    record = () => {
        let { food, calories } = this.state; 

        food = food.map(io => io.name)
        this.props.onRecord(food, calories);
    }

    clear = () => {
        this.setState(() => ({
            foodID: 0,
            food: [],
            calories: 0
        }));
    }

    close = () => {
        this.clear();
        this.props.onClose();

        window.history.pushState(null, null, links["FOOD_STATS_PAGE"].absolute);
    }

    render() {
        return(
            <Fragment>
                <div
                    className={ `rn-foodstats-recorderbg${ (!this.props.active) ? "" : " active" }` }
                    onClick={ this.close }
                />
                <div className="rn-foodstats-recorder">
                    <button className="rn-foodstats-recorder-close definp" onClick={ this.close }>
                        <i className="fas fa-times" />
                    </button>
                    <h1 className="rn-foodstats-recorder-name">New meal</h1>
                    <div className="rn-foodstats-recorder-insert">
                        <FlipMove
                            className="rn-foodstats-recorder-foodtags"
                            enterAnimation="elevator"
                            leaveAnimation="elevator">
                            {
                                this.state.food.map(({ id, name }) => (
                                    <RecorderNameTag
                                        key={ id }
                                        name={ name }
                                        _onDelete={() => {
                                            let a = Array.from(this.state.food);

                                            a.splice( a.findIndex(io => io.id === id), 1 );

                                            this.setState(() => ({
                                                food: a
                                            }));
                                        }}
                                    />
                                ))
                            }
                        </FlipMove>
                        <RecorderNameInput
                            _placeholder="Food name"
                            _onSubmit={(value) => {
                                const a = Array.from(this.state.food),
                                      b = this.state.foodID + 1;

                                a.push({
                                    name: value,
                                    id: b
                                });

                                this.setState(() => ({
                                    food: a,
                                    foodID: b
                                }));
                            }}
                        />
                        <RecorderCaloriesSlider
                            calories={ this.state.calories }
                            _onChange={ calories => this.setState({ calories }) }
                        />
                    </div>
                    <button className="rn-foodstats-recorder-submit definp" onClick={ this.record }>Record</button>
                </div>
            </Fragment>
        );
    }
}

class Hero extends Component {
    constructor(props) {
        super(props);

        this.state = {
            recorder: false,
            caloriesData: null,
            mealToday: [],
            addingMeal: false,
            currentListDay: null
        }
    }

    componentDidMount() {
        this.props.notifyLoaded();
        this.loadData();

        { // Get hook
            const a = this.props.match.params.hook;
            switch(a) {
                case 'record':
                    this.setState({ recorder: true });
                break;
                default:break;
            }
        }
    }

    loadData = time => {
        const castError = () => this.props.castAlert({ text: "Something went wrong" });

        if(time) {
            this.setState(() => ({
                currentListDay: time
            }));
        }
        
        client.query({
            query: gql`
                query($time: String) {
                    user {
                        id,
                        caloriesPerDay,
                        caloriesToday,
                        getMeals(time: $time) {
                            id,
                            dishes,
                            name,
                            time,
                            calories
                        }
                    }
                }
            `,
            variables: {
                time: (time) ? time.toString() : "0"
            }
        }).then(({ data: { user: a } }) => {
            if(!a) return castError();

            this.setState({
                caloriesData: {
                    currCalories: (a.caloriesToday > a.caloriesPerDay) ? (
                        a.caloriesPerDay
                    ) : (
                        a.caloriesToday
                    ),
                    maxCalories: a.caloriesPerDay
                },
                mealToday: a.getMeals
            });
        }).catch(e => {
            console.error(e);
            castError();
        });
    }

    recordMeal = (dishes, calories) => {
        this.setState(() => ({
            recorder: false
        }));

        if(!dishes.length) return;

        this.setState(() => ({
            addingMeal: true
        }));

        const castError = () => this.props.castAlert({
            text: "An error occured"
        });

        client.mutate({
            mutation: gql`
                mutation($dishes: [String!]!, $calories: Int!) {
                    recordMeal(dishes: $dishes, calories: $calories) {
                        id,
                        dishes,
                        name,
                        time,
                        calories
                    }
                }
            `,
            variables: {
                dishes, calories
            }
        }).then(({ data: { recordMeal: a } }) => {
            if(!a) return castError();

            this.setState(({ mealToday, caloriesData }) => {
                let calories = caloriesData.currCalories + a.calories;
                if(calories > caloriesData.maxCalories)
                    calories = caloriesData.maxCalories;

                return ({
                    mealToday: [
                        a,
                        ...mealToday
                    ],
                    addingMeal: false,
                    caloriesData: {
                        ...caloriesData,
                        currCalories: calories
                    }
                });
            })
        }).catch((e) => {
            console.error(e);
            castError();
        })
    }

    deleteMeal = id => {
        const castError = () => this.props.castAlert({
            text: "An error occured"
        });

        const mealToday = this.state.mealToday;
        mealToday.splice(mealToday.findIndex(io => io.id === id), 1);

        this.setState(() => ({
            mealToday: mealToday
        }));

        client.mutate({
            mutation: gql`
                mutation($targetID: ID!) {
                    deleteMeal(targetID: $targetID)
                }
            `,
            variables: {
                targetID: id
            }
        }).then(({ data: { deleteMeal: a } }) => {
            if(!a) return castError();
        }).catch((e) => {
            console.error(e);
            castError();
        });
    }

    render() {
        return(
            <div className="rn rn_nav rn-foodstats">
                <Header
                    workOS={ this.props.workOS }
                    caloriesData={ this.state.caloriesData }
                    onRecord={ () => this.setState({ recorder: true }) }
                    onChooseTime={ this.loadData }
                    currentListDay={ this.state.currentListDay }
                />
                <MealsList
                    list={ this.state.mealToday }
                    addingItem={ this.state.addingMeal }
                    onDeleteMeal={ this.deleteMeal }
                />
                <Recorder
                    active={ this.state.recorder }
                    onRecord={ this.recordMeal }
                    onClose={ () => this.setState({ recorder: false }) }
                />
            </div>
        );
    }
}

const mapStateToProps = ({ session }) => ({
    workOS: session.workOS
});

const mapActionsToProps = {
    notifyLoaded: () => ({ type: "NOTIFY_NEW_PAGE", payload: "FOOD_STATS_PAGE" }),
    castAlert: payload => ({ type: "CAST_GLOBAL_ERROR", payload })
}

export default connect(
    mapStateToProps,
    mapActionsToProps
)(Hero);