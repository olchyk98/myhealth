import React, { Component, PureComponent, Fragment } from 'react';
import './main.css';

import { connect } from 'react-redux';
import { gql } from 'apollo-boost';

import client from '../../apollo';
import api from '../../api';
import LoadIcon from '../__forall__/load.icon';
import Slider from '../__forall__/slider';
import ActivityField from '../__forall__/activity.field';

const inviteSuggLimit = 15;

class PeopleFieldItem extends PureComponent {
    render() {
        return(
            <div className={ `rn-training-peoplefield-search-users-item${ (!this.props.selected) ? "" : " selected" }` } onClick={ this.props._onClick }>
                <div className="rn-training-peoplefield-search-users-item-avatar">
                    <img src={ api.storage + this.props.avatar } alt="user avatar" />
                </div>
                <span className="rn-training-peoplefield-search-users-item-name">{ this.props.name }</span>
            </div>
        );
    }
}

class PeopleField extends Component {
    constructor(props) {
        super(props);

        this.state = {
            opened: false,
            suggestions: null
        }
    }

    loadPeopleSugg = (login = null) => {
        this.setState(() => ({
            suggestions: false
        }));
        
        const castError = () => this.props.castAlert({
            text: "Something went wrong"
        });

        const offsetID = this.props.people.slice(-1);
        client.query({
            query: gql`
                query($offsetID: ID, $login: String, $limit: Int) {
                    getTrainingPeopleSuggestions(offsetID: $offsetID, login: $login, limit: $limit) {
                        id,
                        avatar,
                        login
                    }
                }
            `,
            variables: {
                offsetID: (offsetID && offsetID[0]) || null,
                login,
                limit: inviteSuggLimit
            }
        }).then(({ data: { getTrainingPeopleSuggestions: a } }) => {
            this.setState(() => ({
                suggestions: a || []
            }));
        }).catch((e) => {
            console.error(e);
            castError();
        });
    }

    render() {
        return(
            <Fragment>
                <div className={ `rn-training-peoplefield_outbg${ (!this.state.opened) ? "" : " active" }` }
                    onClick={ () => this.setState({ opened: false }) }
                />
                <div className="rn-training-peoplefield">
                    <span className="rn-training-peoplefield-countd" onClick={() => {
                        this.setState({ opened: true });
                        if(!this.state.suggestions) {
                            this.setState(() => ({
                                suggestions: false
                            }));
                            this.loadPeopleSugg();
                        }
                    }}>{ this.props.people.length } people invited</span>
                    <div className={ `rn-training-peoplefield-search${ (!this.state.opened) ? "" : " opened" }` }>
                        <input className="rn-training-peoplefield-search-mat definp"
                            type="search"
                            placeholder="Search people..."
                            onChange={({ target }) => {
                                clearTimeout(target.typeInt);
                                target.typeInt = setTimeout(() => {
                                    this.loadPeopleSugg(target.value);
                                }, 25);
                            }}
                        />
                        {
                            (!this.state.suggestions) ? (
                                <LoadIcon />
                            ) : (
                                <Fragment>
                                    {
                                        (this.state.suggestions.length) ? (
                                            <span className="rn-training-peoplefield-search-ustit">
                                                Search results
                                            </span>
                                        ) : (
                                            <span className="rn-training-peoplefield-search-ustit">
                                                Nothing here
                                            </span>
                                        )
                                    }
                                    <div className="rn-training-peoplefield-search-users">
                                        {
                                            this.state.suggestions.map(({ id, avatar, login }) => (
                                                <PeopleFieldItem
                                                    key={ id }
                                                    avatar={ avatar }
                                                    selected={ this.props.people.includes(id) }
                                                    name={ login }
                                                    _onClick={ () => this.props.onTogglePeople(id) }
                                                />
                                            ))
                                        }
                                    </div>
                                </Fragment>
                            )
                        }
                    </div>
                </div>
            </Fragment>
        );
    }
}

class TrainingEditor extends Component {
    constructor(props) {
        super(props);

        this.state = {
            calories: 0,
            minutes: 0,
            action: "",
            people: [],
            creatingItem: false
        }
    }
    
    createTraining = () => {
        this.setState(() => ({
            creatingItem: true
        }));

        const { calories, minutes, action, people } = this.state;
        const castError = () => this.props.castAlert({
            text: "Something went wrong"
        });

        client.mutate({
            mutation: gql`
                mutation($calories: Int!, $minutes: Int!, $action: String!, $peopleID: [ID!]!) {
                    createTraining(calories: $calories, minutes: $minutes, action: $action, peopleID: $peopleID) {
                        id
                    }
                }
            `,
            variables: {
                calories,
                minutes,
                action,
                peopleID: people
            }
        }).then(({ data: { createTraining: a } }) => {
            this.setState(() => ({
                creatingItem: false
            }));

            if(!a) return castError();
        }).catch((e) => {
            console.error(e);
            castError();
        });
    }

    render() {
        return(
            <div className="rn-training-create">
                <h2 className="rn-training-create-title">New training</h2>
                <div className="rn-training-create-container">
                    <Slider
                        value={ this.state.calories }
                        maxValue={ 24000 }
                        title="Burned calories"
                        _onChange={ value => this.setState({ calories: value }) }
                        _disabled={ this.state.creatingItem }
                    />
                    <Slider
                        value={ this.state.minutes }
                        maxValue={ 720 }
                        title="Minutes"
                        _onChange={ value => this.setState({ minutes: value }) }
                        _disabled={ this.state.creatingItem }
                    />
                    <ActivityField
                        currentActivity={ this.state.action }
                        selectActivity={ label => this.setState({ action: label }) }
                    />
                    <PeopleField
                        people={ this.state.people }
                        castAlert={ this.props.castAlert }
                        onTogglePeople={(id) => {
                            let a = Array.from(this.state.people);
                            if(!a.includes(id)) a.push(id);
                            else a.splice(a.findIndex(io => io === id), 1);
                            this.setState(() => ({
                                people: a
                            }));
                        }}
                    />
                    <button
                        className="definp rn-training-create-submit"
                        disabled={ this.state.creatingItem }
                        onClick={ this.createTraining }>
                        {
                            (!this.state.creatingItem) ? (
                                <>Record training</>
                            ) : (
                                <LoadIcon />
                            )
                        }
                    </button>
                </div>
            </div>
        );
    }
}

class TrainingsHistoryItemAuth extends PureComponent {
    render() {
        return(
            <div className="rn-training-trhistory-mat-item-name_auth-auth-item">
                <img
                    alt="contributor"
                    src={ api.storage + this.props.avatar }
                />
                <span>{ this.props.login }</span>
            </div>
        );
    }
}

class TrainingsHistoryItem extends PureComponent {
    convertTime(time) { // clr func
        const a = new Date(+time),
              b = b => (b.toString().length === 2) ? b : "0" + b;

        return `${ b(a.getHours()) }:${ b(a.getMinutes()) }`;
    }

    render() {
        return(
            <div className="rn-training-trhistory-mat-item">
                <div className="rn-training-trhistory-mat-item-name_auth">
                    <span className="rn-training-trhistory-mat-item-name_auth-name">{ this.props.title }</span>
                    <div className="rn-training-trhistory-mat-item-name_auth-name-icon">
                        <i className="fas fa-running" />
                    </div>
                    <div className="rn-training-trhistory-mat-item-name_auth-auth">
                        {
                            this.props.people.map(({ id, login, avatar }) => (
                                <TrainingsHistoryItemAuth
                                    key={ id }
                                    login={ login }
                                    avatar={ avatar }
                                />       
                            ))
                        }
                    </div>
                </div>
                <div className="rn-training-trhistory-mat-item-info">
                    <span>{ this.convertTime(this.props.time) }</span>
                    <span>•</span>
                    <span>{ this.props.calories } calories</span>
                    <span>•</span>
                    <span>{ this.props.minutes } minutes</span>
                    <span>•</span>
                    <span>{ this.props.people.length } people</span>
                </div>
            </div>
        );
    }
}

class TrainingsHistory extends Component {
    render() {
        return(
            <div className={ `rn-training-trhistory${ (!this.props.active) ? "" : " active" }` }>
                <button className="definp rn-training-trhistory-close close" onClick={ this.props.onClose }>
                    <i className="fas fa-times" />
                </button>
                <div className="rn-training-trhistory-mat">
                    {
                        (this.props.history) ? (
                            this.props.history.map(({ id, title, action, people, minutes, destroyedCalories, time }) => (
                                <TrainingsHistoryItem
                                    key={ id }
                                    title={ title }
                                    action={ action }
                                    people={ people }
                                    minutes={ minutes }
                                    calories={ destroyedCalories }
                                    time={ time }
                                />           
                            ))
                        ) : (
                            <LoadIcon />
                        )
                    }
                </div>
            </div>
        );
    }
}

class Hero extends Component {
    constructor(props) {
        super(props);

        this.state = {
            historyOpened: false,
            history: null
        }
    }

    componentDidMount() {
        this.props.notifyLoaded();
    }

    fetchHistory = () => {
        const castError = () => this.props.castAlert({
            text: "Something went wrong"
        });

        if(!this.state.history) {
            this.setState(() => ({
                history: false
            }));
        }

        client.query({
            query: gql`
                query {
                    user {
                        id,
                        trainings {
                            id,
                            title,
                            action,
                            people {
                                id,
                                avatar,
                                login
                            },
                            minutes,
                            destroyedCalories,
                            time
                        }
                    }
                }
            `
        }).then(({ data: { user: a } }) => {
            if(!a) return castError();

            this.setState(() => ({
                history: a.trainings
            }))
        }).catch((e) => {
            console.error(e);
            castError();
        });
    }

    render() {
        return(
            <div className="rn rn_nav rn-training">
                <div className="rn-training-info">
                    <h2 className="rn-training-info-title">Training section</h2>
                    <p className="rn-training-info-desc">Here you can record your training.</p>
                    <p className="rn-training-info-desc">Or just view your trainings history</p>
                    <button
                        className="rn-training-info-historybtn definp"
                        onClick={() => {
                            this.setState(() => ({
                                historyOpened: true
                            }));
                            this.fetchHistory();
                        }}>
                        View history
                    </button>
                </div>
                <TrainingsHistory
                    active={ this.state.historyOpened }
                    history={ this.state.history }
                    onClose={ () => this.setState({ historyOpened: false }) }
                />
                <TrainingEditor
                    castAlert={ this.props.castAlert }
                />
            </div>
        );
    }
}

const mapStateToProps = () => ({});

const mapActionsToProps = {
    notifyLoaded: () => ({ type: "NOTIFY_NEW_PAGE", payload: "TRAINING_PAGE" }),
    castAlert: payload => ({ type: "CAST_GLOBAL_ERROR", payload })
}

export default connect(
    mapStateToProps,
    mapActionsToProps
)(Hero);