import { cn } from '../../lib/utils';
import React, { useState, useEffect, useMemo, useRef } from 'react';

import { Outlet } from 'react-router-dom';

import { motion } from 'motion/react';

import SovereignSidebar from './SovereignSidebar';

import {
    Menu01Icon,
    Home01Icon,
    Book02Icon,
    Notification01Icon,
    MapsLocation02Icon,
    Calendar03Icon,
    SparklesIcon,
    Cancel01Icon,
    Upload01Icon,
    Logout01Icon,
    UserIcon,
    GithubIcon,
    Linkedin02Icon,
    Mail01Icon,
} from 'hugeicons-react';

import { DiscreteTabs } from '../watermelon/discrete-tabs';
import { TetrisLoader } from '../ui/loader-tetris';
import { IconFolder } from '../ui/icon-folder';

const DEVELOPER_TECH_ICONS = [
    {
        label: "PostgreSQL",
        background: "linear-gradient(135deg,#1b2b40,#0d1724)",
        node: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="56%" height="56%">
                <path fill="#295276" d="M93.809 92.112c.785-6.533.55-7.492 5.416-6.433l1.235.108c3.742.17 8.637-.602 11.513-1.938 6.191-2.873 9.861-7.668 3.758-6.409-13.924 2.873-14.881-1.842-14.881-1.842 14.703-21.815 20.849-49.508 15.543-56.287-14.47-18.489-39.517-9.746-39.936-9.52l-.134.025c-2.751-.571-5.83-.912-9.289-.968-6.301-.104-11.082 1.652-14.709 4.402 0 0-44.683-18.409-42.604 23.151.442 8.841 12.672 66.898 27.26 49.362 5.332-6.412 10.484-11.834 10.484-11.834 2.558 1.699 5.622 2.567 8.834 2.255l.249-.212c-.078.796-.044 1.575.099 2.497-3.757 4.199-2.653 4.936-10.166 6.482-7.602 1.566-3.136 4.355-.221 5.084 3.535.884 11.712 2.136 17.238-5.598l-.22.882c1.474 1.18 1.375 8.477 1.583 13.69.209 5.214.558 10.079 1.621 12.948 1.063 2.868 2.317 10.256 12.191 8.14 8.252-1.764 14.561-4.309 15.136-27.985" />
                <path fill="#336791" d="M115.731 77.44c-13.925 2.873-14.882-1.842-14.882-1.842 14.703-21.816 20.849-49.51 15.545-56.287C101.924.823 76.875 9.566 76.457 9.793l-.135.024c-2.751-.571-5.83-.911-9.291-.967-6.301-.103-11.08 1.652-14.707 4.402 0 0-44.684-18.408-42.606 23.151.442 8.842 12.672 66.899 27.26 49.363 5.332-6.412 10.483-11.834 10.483-11.834 2.559 1.699 5.622 2.567 8.833 2.255l.25-.212c-.078.796-.042 1.575.1 2.497-3.758 4.199-2.654 4.936-10.167 6.482-7.602 1.566-3.136 4.355-.22 5.084 3.534.884 11.712 2.136 17.237-5.598l-.221.882c1.473 1.18 2.507 7.672 2.334 13.557-.174 5.885-.29 9.926.871 13.082 1.16 3.156 2.316 10.256 12.192 8.14 8.252-1.768 12.528-6.351 13.124-13.995.422-5.435 1.377-4.631 1.438-9.49l.767-2.3c.884-7.367.14-9.743 5.225-8.638l1.235.108c3.742.17 8.639-.602 11.514-1.938 6.19-2.871 9.861-7.667 3.758-6.408z" />
                <path fill="#fff" d="M75.957 122.307c-8.232 0-10.84-6.519-11.907-9.185-1.562-3.907-1.899-19.069-1.551-31.503a1.59 1.59 0 011.64-1.55 1.594 1.594 0 011.55 1.639c-.401 14.341.168 27.337 1.324 30.229 1.804 4.509 4.54 8.453 12.275 6.796 7.343-1.575 10.093-4.359 11.318-11.46.94-5.449 2.799-20.951 3.028-24.01a1.593 1.593 0 011.71-1.472 1.597 1.597 0 011.472 1.71c-.239 3.185-2.089 18.657-3.065 24.315-1.446 8.387-5.185 12.191-13.794 14.037-1.463.313-2.792.453-4 .454zM31.321 90.466a6.71 6.71 0 01-2.116-.35c-5.347-1.784-10.44-10.492-15.138-25.885-3.576-11.717-5.842-23.947-6.041-27.922-.589-11.784 2.445-20.121 9.02-24.778 13.007-9.216 34.888-.44 35.813-.062a1.596 1.596 0 01-1.207 2.955c-.211-.086-21.193-8.492-32.768-.285-5.622 3.986-8.203 11.392-7.672 22.011.167 3.349 2.284 15.285 5.906 27.149 4.194 13.742 8.967 22.413 13.096 23.79.648.216 2.62.873 5.439-2.517A245.272 245.272 0 0145.88 73.046a1.596 1.596 0 012.304 2.208c-.048.05-4.847 5.067-10.077 11.359-2.477 2.979-4.851 3.853-6.786 3.853zm69.429-13.445a1.596 1.596 0 01-1.322-2.487c14.863-22.055 20.08-48.704 15.612-54.414-5.624-7.186-13.565-10.939-23.604-11.156-7.433-.16-13.341 1.738-14.307 2.069l-.243.099c-.971.305-1.716-.227-1.997-.849a1.6 1.6 0 01.631-2.025c.046-.027.192-.089.429-.176l-.021.006.021-.007c1.641-.601 7.639-2.4 15.068-2.315 11.108.118 20.284 4.401 26.534 12.388 2.957 3.779 2.964 12.485.019 23.887-3.002 11.625-8.651 24.118-15.497 34.277-.306.457-.81.703-1.323.703zm.76 10.21c-2.538 0-4.813-.358-6.175-1.174-1.4-.839-1.667-1.979-1.702-2.584-.382-6.71 3.32-7.878 5.208-8.411-.263-.398-.637-.866-1.024-1.349-1.101-1.376-2.609-3.26-3.771-6.078-.182-.44-.752-1.463-1.412-2.648-3.579-6.418-11.026-19.773-6.242-26.612 2.214-3.165 6.623-4.411 13.119-3.716C97.6 28.837 88.5 10.625 66.907 10.271c-6.494-.108-11.82 1.889-15.822 5.93-8.96 9.049-8.636 25.422-8.631 25.586a1.595 1.595 0 11-3.19.084c-.02-.727-.354-17.909 9.554-27.916C53.455 9.272 59.559 6.96 66.96 7.081c13.814.227 22.706 7.25 27.732 13.101 5.479 6.377 8.165 13.411 8.386 15.759.165 1.746-1.088 2.095-1.341 2.147l-.576.013c-6.375-1.021-10.465-.312-12.156 2.104-3.639 5.201 3.406 17.834 6.414 23.229.768 1.376 1.322 2.371 1.576 2.985.988 2.396 2.277 4.006 3.312 5.3.911 1.138 1.7 2.125 1.982 3.283.131.23 1.99 2.98 13.021.703 2.765-.57 4.423-.083 4.93 1.45.997 3.015-4.597 6.532-7.694 7.97-2.775 1.29-7.204 2.106-11.036 2.106zm-4.696-4.021c.35.353 2.101.962 5.727.806 3.224-.138 6.624-.839 8.664-1.786 2.609-1.212 4.351-2.567 5.253-3.492l-.5.092c-7.053 1.456-12.042 1.262-14.828-.577a6.162 6.162 0 01-.54-.401c-.302.119-.581.197-.78.253-1.58.443-3.214.902-2.996 5.105zm-45.562 8.915c-1.752 0-3.596-.239-5.479-.71-1.951-.488-5.24-1.957-5.19-4.37.057-2.707 3.994-3.519 5.476-3.824 5.354-1.103 5.703-1.545 7.376-3.67.488-.619 1.095-1.39 1.923-2.314 1.229-1.376 2.572-2.073 3.992-2.073.989 0 1.8.335 2.336.558 1.708.708 3.133 2.42 3.719 4.467.529 1.847.276 3.625-.71 5.006-3.237 4.533-7.886 6.93-13.443 6.93zm-7.222-4.943c.481.372 1.445.869 2.518 1.137 1.631.408 3.213.615 4.705.615 4.546 0 8.196-1.882 10.847-5.594.553-.774.387-1.757.239-2.274-.31-1.083-1.08-2.068-1.873-2.397-.43-.178-.787-.314-1.115-.314-.176 0-.712 0-1.614 1.009a41.146 41.146 0 00-1.794 2.162c-2.084 2.646-3.039 3.544-9.239 4.821-1.513.31-2.289.626-2.674.835zm12.269-7.36a1.596 1.596 0 01-1.575-1.354 8.218 8.218 0 01-.08-.799c-4.064-.076-7.985-1.82-10.962-4.926-3.764-3.927-5.477-9.368-4.699-14.927.845-6.037.529-11.366.359-14.229-.047-.796-.081-1.371-.079-1.769.003-.505.013-1.844 4.489-4.113 1.592-.807 4.784-2.215 8.271-2.576 5.777-.597 9.585 1.976 10.725 7.246 3.077 14.228.244 20.521-1.825 25.117-.385.856-.749 1.664-1.04 2.447l-.257.69c-1.093 2.931-2.038 5.463-1.748 7.354a1.595 1.595 0 01-1.335 1.819l-.244.02zM42.464 42.26l.062 1.139c.176 2.974.504 8.508-.384 14.86-.641 4.585.759 9.06 3.843 12.276 2.437 2.542 5.644 3.945 8.94 3.945h.068c.369-1.555.982-3.197 1.642-4.966l.255-.686c.329-.884.714-1.74 1.122-2.646 1.991-4.424 4.47-9.931 1.615-23.132-.565-2.615-1.936-4.128-4.189-4.627-4.628-1.022-11.525 2.459-12.974 3.837zm9.63-.677c-.08.564 1.033 2.07 2.485 2.271 1.449.203 2.689-.975 2.768-1.539.079-.564-1.033-1.186-2.485-1.388-1.451-.202-2.691.092-2.768.656zm2.818 2.826l-.407-.028c-.9-.125-1.81-.692-2.433-1.518-.219-.29-.576-.852-.505-1.354.101-.736.999-1.177 2.4-1.177.313 0 .639.023.967.069.766.106 1.477.327 2.002.62.91.508.977 1.075.936 1.368-.112.813-1.405 2.02-2.96 2.02zm-2.289-2.732c.045.348.907 1.496 2.029 1.651l.261.018c1.036 0 1.81-.815 1.901-1.082-.096-.182-.762-.634-2.025-.81a5.823 5.823 0 00-.821-.059c-.812 0-1.243.183-1.345.282zm43.605-1.245c.079.564-1.033 2.07-2.484 2.272-1.45.202-2.691-.975-2.771-1.539-.076-.564 1.036-1.187 2.486-1.388 1.45-.203 2.689.092 2.769.655zm-2.819 2.56c-1.396 0-2.601-1.086-2.7-1.791-.115-.846 1.278-1.489 2.712-1.688.316-.044.629-.066.93-.066 1.238 0 2.058.363 2.14.949.053.379-.238.964-.739 1.492-.331.347-1.026.948-1.973 1.079l-.37.025zm.943-3.013c-.276 0-.564.021-.856.061-1.441.201-2.301.779-2.259 1.089.048.341.968 1.332 2.173 1.332l.297-.021c.787-.109 1.378-.623 1.66-.919.443-.465.619-.903.598-1.052-.028-.198-.56-.49-1.613-.49zm3.965 32.843a1.594 1.594 0 01-1.324-2.483c3.398-5.075 2.776-10.25 2.175-15.255-.257-2.132-.521-4.337-.453-6.453.07-2.177.347-3.973.614-5.71.317-2.058.617-4.002.493-6.31a1.595 1.595 0 113.186-.172c.142 2.638-.197 4.838-.525 6.967-.253 1.643-.515 3.342-.578 5.327-.061 1.874.178 3.864.431 5.97.64 5.322 1.365 11.354-2.691 17.411a1.596 1.596 0 01-1.328.708z" />
            </svg>
        ),
    }
    ,
    {
        label: "Spring Boot",
        background: "linear-gradient(135deg,#1b3d22,#0d1f11)",
        node: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="56%" height="56%">
                <path d="M116.452 6.643a59.104 59.104 0 01-6.837 12.136A64.249 64.249 0 0064.205-.026C28.984-.026 0 28.982 0 64.242a64.316 64.316 0 0019.945 46.562l2.368 2.1a64.22 64.22 0 0041.358 15.122c33.487 0 61.637-26.24 64.021-59.683 1.751-16.371-3.051-37.077-11.24-61.7zM29.067 111.17a5.5 5.5 0 01-4.269 2.034c-3.018 0-5.487-2.484-5.487-5.502 0-3.017 2.485-5.501 5.487-5.501 1.25 0 2.485.433 3.452 1.234 2.351 1.9 2.718 5.384.817 7.735zm87.119-19.238c-15.843 21.122-49.68 14.003-71.376 15.02 0 0-3.852.234-7.721.867 0 0 1.45-.617 3.335-1.334 15.226-5.301 22.43-6.335 31.685-11.086 17.427-8.869 34.654-28.274 38.24-48.463-6.637 19.422-26.75 36.11-45.077 42.895-12.557 4.635-35.238 9.136-35.238 9.136l-.917-.484c-15.442-7.518-15.91-40.977 12.157-51.78 12.291-4.735 24.048-2.134 37.323-5.302 14.175-3.367 30.568-14.004 37.238-27.874 7.471 22.19 16.46 56.932.35 78.405z" fill="#77bc1f" />
            </svg>
        ),
    },
    {
        label: "React",
        background: "linear-gradient(135deg,#122538,#08131d)",
        node: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="56%" height="56%">
                <g fill="#61DAFB">
                    <circle cx="64" cy="64" r="11.4" />
                    <path d="M107.3 45.2c-2.2-.8-4.5-1.6-6.9-2.3.6-2.4 1.1-4.8 1.5-7.1 2.1-13.2-.2-22.5-6.6-26.1-1.9-1.1-4-1.6-6.4-1.6-7 0-15.9 5.2-24.9 13.9-9-8.7-17.9-13.9-24.9-13.9-2.4 0-4.5.5-6.4 1.6-6.4 3.7-8.7 13-6.6 26.1.4 2.3.9 4.7 1.5 7.1-2.4.7-4.7 1.4-6.9 2.3C8.2 50 1.4 56.6 1.4 64s6.9 14 19.3 18.8c2.2.8 4.5 1.6 6.9 2.3-.6 2.4-1.1 4.8-1.5 7.1-2.1 13.2.2 22.5 6.6 26.1 1.9 1.1 4 1.6 6.4 1.6 7.1 0 16-5.2 24.9-13.9 9 8.7 17.9 13.9 24.9 13.9 2.4 0 4.5-.5 6.4-1.6 6.4-3.7 8.7-13 6.6-26.1-.4-2.3-.9-4.7-1.5-7.1 2.4-.7 4.7-1.4 6.9-2.3 12.5-4.8 19.3-11.4 19.3-18.8s-6.8-14-19.3-18.8zM92.5 14.7c4.1 2.4 5.5 9.8 3.8 20.3-.3 2.1-.8 4.3-1.4 6.6-5.2-1.2-10.7-2-16.5-2.5-3.4-4.8-6.9-9.1-10.4-13 7.4-7.3 14.9-12.3 21-12.3 1.3 0 2.5.3 3.5.9zM81.3 74c-1.8 3.2-3.9 6.4-6.1 9.6-3.7.3-7.4.4-11.2.4-3.9 0-7.6-.1-11.2-.4-2.2-3.2-4.2-6.4-6-9.6-1.9-3.3-3.7-6.7-5.3-10 1.6-3.3 3.4-6.7 5.3-10 1.8-3.2 3.9-6.4 6.1-9.6 3.7-.3 7.4-.4 11.2-.4 3.9 0 7.6.1 11.2.4 2.2 3.2 4.2 6.4 6 9.6 1.9 3.3 3.7 6.7 5.3 10-1.7 3.3-3.4 6.6-5.3 10zm8.3-3.3c1.5 3.5 2.7 6.9 3.8 10.3-3.4.8-7 1.4-10.8 1.9 1.2-1.9 2.5-3.9 3.6-6 1.2-2.1 2.3-4.2 3.4-6.2zM64 97.8c-2.4-2.6-4.7-5.4-6.9-8.3 2.3.1 4.6.2 6.9.2 2.3 0 4.6-.1 6.9-.2-2.2 2.9-4.5 5.7-6.9 8.3zm-18.6-15c-3.8-.5-7.4-1.1-10.8-1.9 1.1-3.3 2.3-6.8 3.8-10.3 1.1 2 2.2 4.1 3.4 6.1 1.2 2.2 2.4 4.1 3.6 6.1zm-7-25.5c-1.5-3.5-2.7-6.9-3.8-10.3 3.4-.8 7-1.4 10.8-1.9-1.2 1.9-2.5 3.9-3.6 6-1.2 2.1-2.3 4.2-3.4 6.2zM64 30.2c2.4 2.6 4.7 5.4 6.9 8.3-2.3-.1-4.6-.2-6.9-.2-2.3 0-4.6.1-6.9.2 2.2-2.9 4.5-5.7 6.9-8.3zm22.2 21l-3.6-6c3.8.5 7.4 1.1 10.8 1.9-1.1 3.3-2.3 6.8-3.8 10.3-1.1-2.1-2.2-4.2-3.4-6.2zM31.7 35c-1.7-10.5-.3-17.9 3.8-20.3 1-.6 2.2-.9 3.5-.9 6 0 13.5 4.9 21 12.3-3.5 3.8-7 8.2-10.4 13-5.8.5-11.3 1.4-16.5 2.5-.6-2.3-1-4.5-1.4-6.6zM7 64c0-4.7 5.7-9.7 15.7-13.4 2-.8 4.2-1.5 6.4-2.1 1.6 5 3.6 10.3 6 15.6-2.4 5.3-4.5 10.5-6 15.5C15.3 75.6 7 69.6 7 64zm28.5 49.3c-4.1-2.4-5.5-9.8-3.8-20.3.3-2.1.8-4.3 1.4-6.6 5.2 1.2 10.7 2 16.5 2.5 3.4 4.8 6.9 9.1 10.4 13-7.4 7.3-14.9 12.3-21 12.3-1.3 0-2.5-.3-3.5-.9zM96.3 93c1.7 10.5.3 17.9-3.8 20.3-1 .6-2.2.9-3.5.9-6 0-13.5-4.9-21-12.3 3.5-3.8 7-8.2 10.4-13 5.8-.5 11.3-1.4 16.5-2.5.6 2.3 1 4.5 1.4 6.6zm9-15.6c-2 .8-4.2 1.5-6.4 2.1-1.6-5-3.6-10.3-6-15.6 2.4-5.3 4.5-10.5 6-15.5 13.8 4 22.1 10 22.1 15.6 0 4.7-5.8 9.7-15.7 13.4z" />
                </g>
            </svg>
        ),
    },

    {
        label: "Java",
        background: "linear-gradient(135deg,#1c2d3d,#0d1722)",
        node: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="56%" height="56%">
                <path fill="#0074BD" d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z" />
                <path fill="#EA2D2E" d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z" />
                <path fill="#0074BD" d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z" />
                <path fill="#EA2D2E" d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z" />
                <path fill="#0074BD" d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z" />
            </svg>
        ),
    },
];

const DEVELOPER_SOCIAL_ICONS = [
    {
        label: "GitHub",
        href: "https://github.com/199adarsh",
        background: "linear-gradient(135deg,#24292e,#111518)",
        node: <GithubIcon size={14} className="text-white" />,
    },
    {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/adarsh-herwade/",
        background: "linear-gradient(135deg,#0077b5,#005582)",
        node: <Linkedin02Icon size={14} className="text-white" />,
    },
    {
        label: "Email",
        href: "mailto:adarshherwade11214@gmail.com",
        background: "linear-gradient(135deg,#c5221f,#8c1613)",
        node: <Mail01Icon size={14} className="text-white" />,
    }
];



import axios from 'axios';

import { toast } from 'sonner';

import UploadNotesView from '../UploadNotesView';



import { useLocation, matchPath, Navigate, useNavigate } from 'react-router-dom';



const API_BASE = import.meta.env.VITE_API_BASE || '/api';



const SovereignLayout = () => {

    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);

    const [subjects, setSubjects] = useState([]);

    const [catalogSubjects, setCatalogSubjects] = useState([]);
    const [isDockMinimized, setIsDockMinimized] = useState(false);

    const [notes, setNotes] = useState([]);

    const [loading, setLoading] = useState(true);

    const [showUpload, setShowUpload] = useState(false);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [showLogoutMenu, setShowLogoutMenu] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showDeveloperModal, setShowDeveloperModal] = useState(false);
    const handleOpenDeveloper = React.useCallback(() => setShowDeveloperModal(true), []);

    const userMenuRef = useRef(null);



    useEffect(() => {

        const handleClickOutside = (e) => {

            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {

                setShowLogoutMenu(false);

            }

        };

        if (showLogoutMenu) {

            document.addEventListener('mousedown', handleClickOutside);

            document.addEventListener('touchstart', handleClickOutside);

        }

        return () => {

            document.removeEventListener('mousedown', handleClickOutside);

            document.removeEventListener('touchstart', handleClickOutside);

        };

    }, [showLogoutMenu]);

    const location = useLocation();

    // Auto-minimize dock whenever route changes
    useEffect(() => {
        setIsDockMinimized(true);
    }, [location.pathname]);

    // Dynamic Page Titles & Clean Analytics Names per page
    useEffect(() => {
        const routeMeta = {
            '/': {
                title: 'Home | CampusAxis',
                desc: 'View attendance, internal marks, and academic updates.'
            },
            '/notes': {
                title: 'Notes & PYQs | CampusAxis',
                desc: 'Download syllabus notes and previous year question papers.'
            },
            '/ai-assistant': {
                title: 'AI Assistant | CampusAxis',
                desc: 'Ask questions and get explanations for your subjects.'
            },
            '/attendance': {
                title: 'Attendance | CampusAxis',
                desc: 'Check subject-wise attendance and minimum criteria.'
            },
            '/roadmaps': {
                title: 'Roadmaps | CampusAxis',
                desc: 'Subject-wise engineering roadmaps and learning guides.'
            },
            '/announcements': {
                title: 'Announcements | CampusAxis',
                desc: 'Latest college notices, timetables, and circulars.'
            }
        };

        const current = Object.entries(routeMeta).find(([path]) => {
            if (path === '/') return location.pathname === '/';
            return location.pathname.startsWith(path);
        });

        const meta = current ? current[1] : {
            title: 'CampusAxis',
            desc: 'Student portal for notes, attendance, and college updates.'
        };

        document.title = meta.title;
        let descTag = document.querySelector('meta[name="description"]');
        if (!descTag) {
            descTag = document.createElement('meta');
            descTag.name = 'description';
            document.head.appendChild(descTag);
        }
        descTag.setAttribute('content', meta.desc);

        // Send clean title & path to Google Analytics
        if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
            window.gtag('event', 'page_view', {
                page_title: meta.title,
                page_location: window.location.href,
                page_path: location.pathname
            });
        }
    }, [location.pathname]);



    // Context Detection: Identify if we are viewing a specific note

    const match = matchPath({ path: "/notes/:id" }, location.pathname);

    const activeNoteId = match?.params?.id;



    const fetchData = async (overrideProfile, overrideSubjects) => {

        try {

            // 1. Read isolated user session from localStorage

            let currentProfile = overrideProfile;

            let currentSubjects = overrideSubjects;



            if (currentProfile === undefined) {

                try {

                    const saved = localStorage.getItem('eduvault_profile');

                    currentProfile = saved ? JSON.parse(saved) : null;

                } catch (e) {

                    currentProfile = null;

                }

            }



            if (currentSubjects === undefined) {

                try {

                    const savedSubs = localStorage.getItem('eduvault_subjects');

                    currentSubjects = savedSubs ? JSON.parse(savedSubs) : [];

                } catch (e) {

                    currentSubjects = [];

                }

            }



            setProfile(currentProfile);



            // 2. Fetch full catalog subjects from backend

            const subsRes = await axios.get(`${API_BASE}/subjects`);

            const catalogSubs = Array.isArray(subsRes.data) ? subsRes.data : [];

            setCatalogSubjects(catalogSubs);



            // 3. Set enrolled subjects using canonical IDs from backend catalog

            const role = localStorage.getItem('eduvault_user_role') || (currentProfile?.dob === 'TEACHER' ? 'teacher' : 'student');

            const isTeacher = role === 'teacher' || role === 'faculty' || role === 'admin';

            let enrolledSubjects = [];



            if (isTeacher) {

                const savedTeacherSubs = localStorage.getItem('eduvault_teacher_subjects');

                if (savedTeacherSubs) {

                    try {

                        const parsed = JSON.parse(savedTeacherSubs);

                        if (Array.isArray(parsed) && parsed.length > 0) {

                            const filtered = catalogSubs.filter(cs =>

                                parsed.includes(cs.name) || parsed.includes(cs.id) || parsed.some(p => p === cs.name || p === cs.id)

                            );

                            enrolledSubjects = filtered.length > 0 ? filtered : catalogSubs;

                        } else {

                            enrolledSubjects = catalogSubs;

                        }

                    } catch (e) {

                        enrolledSubjects = catalogSubs;

                    }

                } else {

                    enrolledSubjects = catalogSubs;

                }

                setSubjects(enrolledSubjects);

            } else if (currentSubjects && currentSubjects.length > 0) {

                // Strict 3-tier canonical matching: Exact code first, canonical ID second, normalized exact name third.

                // Never generate detached subject IDs; preserve unresolved subjects explicitly.

                enrolledSubjects = currentSubjects.map(ls => {

                    let match = null;

                    if (ls.code && ls.code.trim()) {

                        const cleanCode = ls.code.trim().toUpperCase();

                        const codeMatches = catalogSubs.filter(cs => cs.code && cs.code.trim().toUpperCase() === cleanCode);

                        if (codeMatches.length === 1) match = codeMatches[0];

                    }

                    if (!match && ls.id && ls.id.trim()) {

                        const idMatches = catalogSubs.filter(cs => cs.id && cs.id.toLowerCase() === ls.id.trim().toLowerCase());

                        if (idMatches.length === 1) match = idMatches[0];

                    }

                    if (!match && ls.name && ls.name.trim()) {

                        const normLsName = ls.name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();

                        const nameMatches = catalogSubs.filter(cs => {

                            if (!cs.name) return false;

                            const normCsName = cs.name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();

                            return normLsName && normCsName && normLsName === normCsName;

                        });

                        if (nameMatches.length === 1) {

                            match = nameMatches[0];

                        } else if (nameMatches.length > 1) {

                            const deptMatches = nameMatches.filter(cs => normDept(cs.department) === normDept(currentProfile?.department));

                            const pool = deptMatches.length > 0 ? deptMatches : nameMatches;

                            match = pool.reduce((best, cur) => ((cur.noteCount || 0) > (best.noteCount || 0) ? cur : best), pool[0]);

                        }

                    }



                    const canonicalId = match ? match.id : (ls.id || null);

                    return {

                        ...ls,

                        id: canonicalId,

                        canonicalCode: match?.code || ls.code || null,

                        isUnresolved: !canonicalId,

                        department: match?.department || ls.department || currentProfile?.department || 'GENERAL',

                        semester: match?.semester || ls.semester || currentProfile?.semester || 'SEM 01'

                    };

                });

                localStorage.setItem('eduvault_subjects', JSON.stringify(enrolledSubjects));

                setSubjects(enrolledSubjects);

            } else if (currentProfile?.department && currentProfile?.semester) {

                const normDept = (d) => {

                    if (!d) return 'GENERAL';

                    const u = d.toUpperCase();

                    if (u.includes('UAD') || u.includes('AIDS') || u.includes('AI&DS') || u.includes('AI & DS') || u.includes('ARTIFICIAL')) return 'AIDS';

                    if (u.includes('CSE') || u.includes('COMPUTER')) return 'CSE';

                    return u.replace(/[^A-Z0-9]/g, '');

                };

                const normSem = (s) => {

                    if (!s) return 'S01';

                    const m = s.toString().match(/(?:sem|semester|s)?\s*0?([1-8])/i);

                    return m ? `S0${m[1]}` : s.toString().toUpperCase().trim();

                };

                const scoped = catalogSubs.filter(cs =>

                    normDept(cs.department) === normDept(currentProfile.department) &&

                    normSem(cs.semester) === normSem(currentProfile.semester)

                );

                enrolledSubjects = scoped.length > 0 ? scoped : catalogSubs;

                setSubjects(enrolledSubjects);

            } else {

                enrolledSubjects = catalogSubs;

                setSubjects(enrolledSubjects);

            }



            // 4. Fetch notes from server scoped to PRN, role, and canonical enrolled subjects

            const enrolledIds = (enrolledSubjects || []).map(s => s.id).filter(Boolean);

            const notesUrl = (currentProfile?.prn && !isTeacher)

                ? `${API_BASE}/notes?prn=${encodeURIComponent(currentProfile.prn)}`

                : `${API_BASE}/notes`;

            const notesRes = await axios.get(notesUrl, {

                headers: {

                    'X-User-Role': role,

                    'X-Student-PRN': currentProfile?.prn || '',

                    'X-Student-Subjects': enrolledIds.join(',')

                }

            });

            const fetchedNotes = Array.isArray(notesRes.data) ? notesRes.data : [];

            setNotes(fetchedNotes);

        } catch (err) {

            console.error('Error fetching data:', err);

        } finally {

            setLoading(false);

        }

    };



    useEffect(() => {

        fetchData();

    }, []);



    const overallAttendance = useMemo(() => {

        if (!subjects || subjects.length === 0) return null;

        const saved = localStorage.getItem('eduvault_excluded_subjects');

        const excludedIds = saved ? JSON.parse(saved) : [];

        const active = subjects.filter(s => !excludedIds.includes(s.id));

        if (active.length === 0) return null;



        let totalAttended = 0;

        let totalConducted = 0;

        active.forEach(s => {

            const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);

            const att = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);

            totalConducted += cond;

            totalAttended += att;

        });

        if (totalConducted > 0) {

            return ((totalAttended / totalConducted) * 100).toFixed(1);

        }

        return null;

    }, [subjects]);



    const handleLogout = () => {

        localStorage.clear();

        sessionStorage.clear();

        setProfile(null);

        setSubjects([]);

        window.location.replace('/');

        window.location.reload();

    };



    const navTabs = [
        { name: 'Home', path: '/', icon: Home01Icon },
        { name: 'Notes', path: '/notes', icon: Book02Icon },
        { name: 'AI Tutor', path: '/ai-assistant', icon: SparklesIcon },
        { name: 'Notices', path: '/announcements', icon: Notification01Icon },
        { name: 'Roadmaps', path: '/roadmaps', icon: MapsLocation02Icon },
        {
            name: 'Attendance',
            path: '/attendance',
            icon: Calendar03Icon,
            badge: null
        },
    ];



    const activeDockTab = useMemo(() => {

        if (location.pathname === '/') return '/';

        const found = navTabs.find(t => t.path !== '/' && location.pathname.startsWith(t.path));

        return found ? found.path : '/';

    }, [location.pathname, navTabs]);



    const discreteTabItems = useMemo(() => {

        return navTabs.map(t => {

            const Icon = t.icon;

            return {

                id: t.path,

                label: t.name,

                icon: <Icon size={17} className="shrink-0" />,

                badge: t.badge

            };

        });

    }, [navTabs, activeDockTab]);

    const outletContextValue = useMemo(() => ({
        profile,
        subjects,
        catalogSubjects,
        notes,
        refreshData: fetchData,
        setShowUpload,
        sidebarCollapsed,
        setSidebarCollapsed,
        onOpenDeveloper: handleOpenDeveloper
    }), [profile, subjects, catalogSubjects, notes, sidebarCollapsed, handleOpenDeveloper]);

    return (

        <div className="flex h-screen w-full max-w-full overflow-hidden bg-canvas-bg text-text-primary font-sans antialiased selection:bg-primary/20">

            {/* Sidebar */}

            <SovereignSidebar profile={profile} attendance={overallAttendance} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onLogout={handleLogout} collapsed={sidebarCollapsed} onOpenDeveloper={handleOpenDeveloper} />



            {/* Mobile Overlay */}

            {mobileMenuOpen && (

                <div

                    className="fixed inset-0 bg-black/40 z-[45] md:hidden backdrop-blur-xs transition-opacity"

                    onClick={() => setMobileMenuOpen(false)}

                />

            )}



            {/* Content Area */}

            <main className={cn("flex-1 flex flex-col min-w-0 w-full max-w-full h-full overflow-hidden relative transition-all duration-300", sidebarCollapsed ? "md:pl-16" : "md:pl-64")}>

                {/* Mobile Header (Single Clean App Header) */}

                <header className="md:hidden sticky top-0 inset-x-0 z-40 bg-surface-card/95 backdrop-blur-md border-b border-border-subtle pt-safe shrink-0">

                    <div className="h-14 px-3.5 flex items-center justify-between gap-2">

                        <div className="flex items-center gap-2.5 min-w-0">

                            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs shrink-0 border border-border-subtle" title="Campusaxis Portal">
                                <img src="/favicon.png" alt="Campusaxis" className="w-full h-full object-cover" />
                            </div>

                            <div className="flex flex-col min-w-0">

                                <div className="flex items-center gap-1.5 leading-none">

                                    <span className="font-bold text-[15px] tracking-tight text-text-primary leading-tight">Campusaxis</span>

                                    <span className="px-1 py-0.2 text-[8px] font-bold bg-blue-50 text-primary rounded border border-blue-100">Portal</span>

                                </div>

                                <span className="text-[10px] font-medium text-text-secondary truncate mt-0.5">

                                    {profile?.department || 'Student Dashboard'}

                                </span>

                            </div>

                        </div>

                        <div className="flex items-center gap-1 shrink-0">

                            <button

                                onClick={() => navigate('/announcements')}

                                aria-label="Notifications"

                                className="relative w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-slate-100 transition-colors"

                            >

                                <Notification01Icon size={20} className="text-[#8E8E93]" />

                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>

                            </button>

                            <div className="relative" ref={userMenuRef}>

                                <button

                                    onClick={() => setShowLogoutMenu(!showLogoutMenu)}

                                    className="w-8 h-8 rounded-full bg-[#DEEDFC] border border-[#D9ECFF] flex items-center justify-center text-[#0073E6] font-bold text-xs ml-0.5 cursor-pointer shadow-2xs active:scale-95 transition-transform"

                                    aria-label="Profile actions"

                                >

                                    {profile?.name ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('') : <UserIcon size={16} className="text-[#0073E6]" />}

                                </button>



                                {showLogoutMenu && (

                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E2E2E2] rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                                        <div className="px-2.5 py-1.5 border-b border-[#E2E2E2] mb-1">

                                            <p className="text-xs font-bold text-[#383838] truncate">{profile?.name || 'Student'}</p>

                                            <p className="text-[10px] text-[#727272] truncate">{profile?.prn || profile?.rollNo || 'Academic Vault'}</p>

                                        </div>

                                        <button

                                            onClick={() => {

                                                setShowLogoutMenu(false);

                                                handleLogout();

                                            }}

                                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"

                                        >

                                            <Logout01Icon size={16} />

                                            <span>Logout</span>

                                        </button>

                                    </div>

                                )}

                            </div>

                        </div>

                    </div>

                </header>



                {/* Page Content */}

                <div className={`flex-1 w-full max-w-full min-w-0 relative ${location.pathname === '/ai-assistant' || location.pathname.startsWith('/notes/') ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overflow-x-hidden pb-24 md:pb-0'}`}>

                    {loading ? (

                        <div className="h-full min-h-[60vh] flex flex-col items-center justify-center gap-3">

                            <TetrisLoader columns={8} rows={14} cellSize={4} gap={1.5} speed={35} label="Loading CampusAxis..." />

                            <p className="text-xs font-bold uppercase tracking-widest text-[#727272]">Loading CampusAxis...</p>

                        </div>

                    ) : (!profile || !profile.prn || !profile.dob) && location.pathname !== '/' && location.pathname !== '/settings' ? (

                        <Navigate to="/" replace />

                    ) : (

                        <Outlet context={outletContextValue} />

                    )}

                </div>



                {/* Upload Modal Overlay */}

                {showUpload && (

                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">

                        <div className="bg-white  rounded-2xl border border-border-subtle max-w-4xl w-full shadow-2xl relative overflow-hidden">

                            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">

                                <div className="flex items-center gap-2.5">

                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">

                                        <Upload01Icon size={16} className="text-[#0071E3]" />

                                    </div>

                                    <div>

                                        <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight">Upload Notes</h2>

                                        <span className="text-[11px] font-medium text-text-secondary">Share notes and study material with your class</span>

                                    </div>

                                </div>

                                <button

                                    onClick={() => setShowUpload(false)}

                                    className="w-8 h-8 rounded-lg hover:bg-slate-100  text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"

                                >

                                    <Cancel01Icon size={18} />

                                </button>

                            </div>

                            <div className="p-6 max-h-[80vh] overflow-y-auto">

                                <UploadNotesView

                                    profile={profile}

                                    subjects={catalogSubjects.length > 0 ? catalogSubjects : subjects}

                                    onSuccess={() => {

                                        fetchData();

                                        setShowUpload(false);

                                    }}

                                />

                            </div>

                        </div>

                    </div>

                )}



                {/* Floating AI Assistant Quick Access (Adjusted fixed positioning and clearance) */}




                {/* Mobile Floating Bottom Navigation Dock (Collapsible, never overlays notes detail) */}
                {!mobileMenuOpen && !(location.pathname.startsWith('/notes/') && location.pathname !== '/notes') && (
                    <div className="fixed bottom-3 inset-x-0 z-30 md:hidden flex justify-center pointer-events-none px-3">
                        {isDockMinimized ? (
                            <button
                                type="button"
                                onClick={() => setIsDockMinimized(false)}
                                className="pointer-events-auto bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-full px-3.5 py-1.5 shadow-lg flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-white cursor-pointer active:scale-95 transition-all shadow-black/10"
                                title="Expand navigation"
                            >
                                <Menu01Icon size={16} className="text-[#0071E3]" />
                                <span>Menu</span>
                            </button>
                        ) : (
                            <nav
                                aria-label="Mobile Navigation"
                                className="pointer-events-auto bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-full p-1 shadow-lg shadow-black/8 w-auto max-w-[330px] mx-auto flex items-center justify-between gap-0.5"
                            >
                                <DiscreteTabs
                                    tabs={discreteTabItems}
                                    activeTab={activeDockTab}
                                    onTabChange={(path) => {
                                        navigate(path);
                                        setIsDockMinimized(true);
                                    }}
                                    className="h-9 py-0 px-0.5 flex-1 justify-between gap-0.5"
                                    itemClassName="h-8 px-1.5"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsDockMinimized(true)}
                                    className="w-6 h-6 rounded-full text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shrink-0 ml-0.5 mr-0.5 cursor-pointer transition-colors"
                                    title="Minimize navigation bar"
                                >
                                    <Cancel01Icon size={13} />
                                </button>
                            </nav>
                        )}
                    </div>
                )}

                {/* Meet Developer Modal */}
                {showDeveloperModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
                        onClick={() => setShowDeveloperModal(false)}
                    >
                        <div
                            className="relative flex flex-col items-center justify-center p-0 max-w-[420px] w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setShowDeveloperModal(false)}
                                className="absolute -top-3.5 -right-3.5 w-8 h-8 rounded-full bg-[#1c2026] hover:bg-[#252b33] border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer z-40 shadow-md"
                                aria-label="Close"
                            >
                                <Cancel01Icon size={15} />
                            </button>

                            <IconFolder
                                theme="dark"
                                title="Adarsh Herwade"
                                subtitle="Java Developer"
                                tags={["Java", "Spring Boot", "React", "PostgreSQL"]}
                                icons={DEVELOPER_TECH_ICONS}
                                pillIcons={DEVELOPER_SOCIAL_ICONS}
                                defaultOpen={true}
                                spread={74}
                                showPill={true}
                            />
                        </div>
                    </div>
                )}

            </main>

        </div>

    );

};



export default SovereignLayout;

